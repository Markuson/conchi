---
sidebar_position: 3
---

# FCM spike — developer notes

Story 2.1 validated that a self-hosted n8n instance can push a message to a
real Android device over Firebase Cloud Messaging (FCM), before any later
Epic 2 story builds on that assumption (AD-3). This is a developer note, not a
user guide — it documents the pieces you need to reproduce or extend the
spike on your own n8n instance. All values below are placeholders (AD-5);
never commit a real Firebase server key, service-account JSON, or device
token to this repo or any doc.

**Android only.** This spike validates delivery on a real Android device
only — there's no iOS/APNs setup, and the native wiring below (Gradle +
`google-services.json`) is Android-specific. iOS push is unsupported and
untested by this story (Boundaries & Constraints, Story 2.1 spec).

## What the app does

On startup (`src/App.tsx`), if a `webhookUrl` and auth secret are already
configured (mirrors the tracer bullet's `checkConfigured` guard — Story 1.6):

1. Requests notification permission if not already granted.
2. Reads the device's native FCM token via `expo-notifications`'
   `getDevicePushTokenAsync()` — **not** `getExpoPushTokenAsync()`. n8n talks
   to FCM directly via the Firebase Admin SDK, never through Expo's push
   relay, so the app must hand over the raw platform token, not an
   Expo-wrapped one.
3. POSTs `{ token }` to `{webhookUrl}/register-token` (via `joinWebhookUrl`,
   `src/lib/api/n8nClient.ts`) with the same `Authorization: Bearer <secret>`
   header every n8n request carries (AD-5, `postToN8n`).

`webhookUrl` (Settings → CONNEXIÓ) is a **base**, not a full route — it must
be n8n's own `.../webhook` (production) or `.../webhook-test` prefix itself,
with no workflow-specific path after it (e.g. `https://your-n8n.example.com/
webhook`, not `.../webhook/send-expense`). Every call site appends its own
path onto that base: `/register-token` here, `/send-expense` for the tracer
bullet and `validateConnection`'s ping. Pointing `webhookUrl` at one
workflow's specific path (a real mistake made while validating this spike)
makes every *other* endpoint 404, since it appends its own suffix on top of
whatever's already there.

It also attaches a foreground listener
(`Notifications.addNotificationReceivedListener`) that `console.log`s the
`data.type` field and full payload of any message that arrives while the app
is in the foreground — this spike has no Confirmation Card or navigation
wiring yet (that's Story 2.4+), so the console is the only inspection point
for AC2.

## n8n-side setup (placeholders only)

1. **Firebase project.** Create one (or reuse an existing one) in the
   [Firebase console](https://console.firebase.google.com). Download a
   **service account JSON** (Project Settings → Service Accounts → Generate
   new private key) — this is the credential n8n's FCM node needs. Treat it
   like any other secret: it never goes in this repo, never in a screenshot,
   never in a commit.
2. **n8n FCM node/credential.** n8n's built-in **Google Firebase Cloud
   Messaging** node (or an HTTP Request node against
   `https://fcm.googleapis.com/v1/projects/<project-id>/messages:send` with an
   OAuth2 credential built from the service account JSON, if the built-in node
   isn't available on your n8n version) takes that service account as its
   credential.
3. **Registration endpoint.** A webhook workflow at
   `https://your-n8n-instance.example.com/webhook/register-token`, same
   `Header Auth` credential pattern as the tracer-bullet webhook
   (`docs/docs/n8n-webhook-setup.md`). Body: `{ "token": "<fcm-device-token>" }`.
   For this spike it's enough to store the token wherever's convenient (a
   Postgres upsert into a `device_tokens` table, per AD-3, is the eventual
   real shape — not required just to validate delivery).
4. **Test-send workflow.** A second, manually-triggered workflow: FCM node →
   send a combined message to the registered token. Payload shape (AD-3
   convention):

   ```json
   {
     "notification": { "title": "Conchi", "body": "Test push" },
     "data": {
       "type": "invoice_known",
       "entryId": "placeholder-entry-id"
     }
   }
   ```

   `data.type` must be one of `round_trip_result` | `invoice_unknown` |
   `invoice_known` (`src/lib/fcm/types.ts`'s `FcmDataPayload` union) — any of
   the three is fine for validating delivery, since this spike only logs the
   payload rather than branching on it.

## Native Android wiring

`expo-notifications` is bare-workflow linked directly in Gradle rather than
through an Expo config plugin (`app.json` stays minimal):

- `android/build.gradle` adds the `com.google.gms:google-services` Gradle
  plugin classpath.
- `android/app/build.gradle` adds the Firebase BoM + `firebase-messaging`
  dependency and applies the `com.google.gms.google-services` plugin.
- `android/app/google-services.json` — downloaded from the Firebase console
  (Project settings → your Android app, package `com.markuson.conchi`) — must
  exist locally for a debug/App Distribution build to succeed. It's
  gitignored (`android/app/google-services.json` in `.gitignore`) and never
  committed; each developer supplies their own.

## Validating on a real device

1. Place your own `google-services.json` under `android/app/`.
2. Build and install via Firebase App Distribution (existing CI pipeline,
   AD-17) or a local `pnpm android` debug build.
3. Configure Settings → CONNEXIÓ in the app with your n8n **base** URL
   (`.../webhook`, no workflow-specific path after it — see note above) and
   auth secret.
4. Launch the app once so it registers its token — watch Logcat for
   `[fcm] token registration succeeded` (or `[fcm] token registration
   failed` plus the reason, if something's misconfigured).
5. **Background the app** (home button, don't force-close) before
   triggering the test-send workflow in n8n. This matters: while the app is
   foregrounded, `onForegroundMessage`'s listener suppresses the system
   notification by design (AD-3) and only logs `[fcm] foreground message
   received` to Logcat — triggering the test with the app open produces no
   visible push at all, which isn't a delivery failure, just this spike's
   foreground behavior.
6. Trigger the test-send workflow in n8n and confirm the system notification
   appears on-device. Reopen the app and re-trigger once more with it in the
   foreground to also confirm the `[fcm] foreground message received` /
   `data.type` Logcat line from step 4's behavior.

If delivery can't be confirmed end to end, the transport strategy needs to be
revisited before any other Epic 2 story begins — this spike exists
specifically to catch that early.
