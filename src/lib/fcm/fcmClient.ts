import * as Notifications from 'expo-notifications';

import { joinWebhookUrl, postToN8n } from '../api/n8nClient';
import { FCM_REGISTER_PATH } from '../constants';
import type { Entry } from '../types';
import type { FcmDataPayload } from './types';

/**
 * Story 2.1 (FCM spike). `lib/fcm/` never imports from `features/` (AD-3
 * dispatch-bridge rule) — every function here is a plain, parameter-driven
 * wrapper around `expo-notifications`. Callers (today, only `App.tsx`) own
 * reading `webhookUrl`/the auth secret from the store/secure storage and
 * deciding what to do with the results; this module has no state of its own.
 */

/**
 * Requests notification permission if not already granted, then reads the
 * native FCM device token. Resolves `null` (never throws) when permission is
 * denied — the "Permission denied" I/O-matrix row expects registration to be
 * skipped silently, not a rejected promise the caller must also handle.
 *
 * Uses `getDevicePushTokenAsync` — the raw platform token (FCM on Android) —
 * rather than `getExpoPushTokenAsync`'s Expo-push-service token, since n8n
 * sends messages directly via the Firebase Admin SDK (AD-3), never through
 * Expo's push relay.
 */
export async function getFcmToken(): Promise<string | null> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();

    let status = existingStatus;
    if (status !== Notifications.PermissionStatus.GRANTED) {
      ({ status } = await Notifications.requestPermissionsAsync());
    }

    if (status !== Notifications.PermissionStatus.GRANTED) {
      console.log(`[fcm] getFcmToken: permission not granted (status: ${status})`);
      return null;
    }

    // `DevicePushToken`'s `data` field types as `any` in `expo-notifications`'
    // own declarations (its `ImplicitlySupportedDevicePushToken` branch — for
    // platforms this story never targets, no iOS FCM/APNs setup here — types
    // `type` as plain `string`, which stops `type === 'android'` alone from
    // discriminating the union). The explicit `typeof` check narrows `data`
    // itself to `string` rather than trusting the library's `any`.
    const token = await Notifications.getDevicePushTokenAsync();
    if (token.type !== 'android' || typeof token.data !== 'string') {
      console.log(`[fcm] getFcmToken: unexpected token shape (type: ${token.type})`);
      return null;
    }
    return token.data;
  } catch (error) {
    // A native rejection (e.g. Google Play services missing/outdated, or
    // FirebaseApp not initialized because google-services.json wasn't picked
    // up by the Gradle build) is treated the same as "permission denied" —
    // registration is skipped, not surfaced as a crash/unhandled rejection to
    // the caller. Logged here (rather than silently, as originally shipped)
    // because this exact silence made a real device failure undiagnosable.
    console.log('[fcm] getFcmToken threw', error);
    return null;
  }
}

/**
 * POSTs a device token to n8n's registration endpoint, reusing `postToN8n` so
 * the bearer header is never rebuilt here (AD-5). Takes `token` as a
 * parameter rather than calling `getFcmToken()` itself, so the same function
 * serves both the startup registration call and a future `onTokenRefresh`
 * callback (Story 2.4) without duplicating the POST logic. Callers are
 * expected to catch rejections/inspect `response.ok` themselves — this spike
 * has no user-facing error UI yet.
 */
export async function registerFcmToken(token: string, webhookUrl: string, secret: string): Promise<Response> {
  return postToN8n(joinWebhookUrl(webhookUrl, FCM_REGISTER_PATH), secret, { token });
}

/**
 * FCM's native `data` payload is a flat `Map<String, String>` on the wire
 * (both the Firebase Admin SDK and the FCM v1 HTTP API reject non-string
 * field values) — AD-3's `round_trip_result` shape (`{ type, entryId, entry:
 * Entry }`) is the logical contract, but `entry` can only cross the wire as
 * a JSON-stringified string, not a nested object. n8n is expected to
 * `JSON.stringify` it before sending; this parses it back, so a caller
 * reading `payload.entry.amount` etc. never has to know about the wire
 * encoding. Passes other message types through untouched, and drops a
 * `round_trip_result` (rather than forwarding a broken payload downstream,
 * where nothing guards against a missing/malformed `entry` before reading
 * its fields) whenever `entry` is missing, isn't valid JSON, or parses to
 * something other than an object (e.g. `"null"`, `"42"`, an array).
 */
function parseFcmData(data: Record<string, unknown>): FcmDataPayload | undefined {
  if (data.type !== 'round_trip_result') {
    return data as FcmDataPayload;
  }

  let entry: unknown = data.entry;
  if (typeof entry === 'string') {
    try {
      entry = JSON.parse(entry);
    } catch (error) {
      console.log('[fcm] round_trip_result dropped -- entry is not valid JSON', error);
      return undefined;
    }
  }

  if (typeof entry !== 'object' || entry === null) {
    console.log('[fcm] round_trip_result dropped -- entry is missing or not an object');
    return undefined;
  }

  return { ...data, entry: entry as Entry } as FcmDataPayload;
}

/**
 * Wraps `expo-notifications`' `addNotificationReceivedListener` and narrows
 * the payload to `FcmDataPayload` at the boundary, so callers (here, just
 * `App.tsx`'s `console.log`) never touch the untyped native event shape.
 * Foreground-only: per AD-3, a backgrounded/closed app instead lets FCM
 * render the system notification directly — that path isn't exercised by
 * this listener.
 *
 * `event.request.content.data` is `undefined` for a notification-only
 * message (no `data` block) — the callback is skipped rather than invoked
 * with a value that isn't actually a valid `FcmDataPayload`, so callers never
 * have to null/shape-check it themselves.
 */
export function onForegroundMessage(
  callback: (payload: FcmDataPayload) => void,
): ReturnType<typeof Notifications.addNotificationReceivedListener> {
  return Notifications.addNotificationReceivedListener((event) => {
    const data: unknown = event.request.content.data;
    if (!data || typeof data !== 'object' || !('type' in data)) {
      return;
    }
    const payload = parseFcmData(data);
    if (payload) {
      callback(payload);
    }
  });
}
