---
title: 'Story 2.1: FCM Spike — Push Delivery Validation'
type: 'feature'
created: '2026-09-14'
status: 'done'
baseline_commit: '859cafb6cfe33cdcee0cfec5b9140db844a78650'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Epic 2 is built entirely on FCM as the sole async transport (AD-3), but push delivery from the self-hosted n8n instance to a real Android device has never been exercised — if it doesn't work, every later Epic 2 story is built on an unvalidated assumption.

**Approach:** Add `expo-notifications` + native Android Firebase wiring, build a minimal `lib/fcm/` module that requests permission, reads the device push token, registers it with a new n8n endpoint via the existing bearer-auth client, and logs incoming foreground messages for manual inspection. Validate delivery on a real device via Firebase App Distribution and document the n8n-side config as a placeholder-only developer note.

## Boundaries & Constraints

**Always:**
- Every registration POST reuses `postToN8n` (AD-5: bearer header injected there, never rebuilt here).
- The FCM device token is not a secret — never written to `expo-secure-store` or MMKV.
- `lib/fcm/` never imports from `features/` (AD-3 dispatch-bridge rule); only `App.tsx` (shell) wires it.
- `FcmDataPayload` covers all three AD-3 shapes (`round_trip_result` | `invoice_unknown` | `invoice_known`) even though only foreground console-logging exercises it here.
- No real Firebase/n8n credentials, URLs, or device tokens committed anywhere (AD-5); `google-services.json` stays gitignored (already is); the dev note uses placeholders only.

**Ask First:**
- Settings today stores `webhookUrl` as one literal, full endpoint used as-is (Story 1.6, `docs/docs/n8n-webhook-setup.md`). This story needs a second n8n endpoint for token registration. Assumption to confirm before coding: append a fixed path (`/register-token`) to `webhookUrl`, treating it as a base going forward per AD-15 — without touching the existing tracer-bullet call site, which keeps using it as a literal URL until Story 2.4.
- Whether to request notification permission automatically at app startup (this story has no Settings toggle yet — Story 2.7 owns NOTIFICACIONS).

**Never:**
- No Confirmation Card or navigation wiring, no feature-level dispatch of `round_trip_result` (Story 2.4+).
- No iOS FCM/APNs setup this story — Android real-device only, matching the current Android-only Firebase App Distribution pipeline (AD-17).
- No token-refresh UI, no offline-queue interaction (later stories).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy path | Valid `webhookUrl` + secret configured, permission granted | Token fetched; POSTed to `{webhookUrl}/register-token` with Bearer header; n8n responds 2xx | N/A |
| Permission denied | User denies notification permission | `getFcmToken()` resolves `null`; registration skipped; no crash | Logged only |
| Not configured | No `webhookUrl` or secret in Settings | Registration skipped entirely (mirrors `useTracerBullet`'s `checkConfigured` pattern) | N/A |
| Registration HTTP failure | n8n returns non-2xx or network error | Promise rejection caught at call site | Logged only — no user-facing UI yet (spike) |
| Foreground message received | App foregrounded, FCM data payload arrives | Listener logs `data.type` + full payload to console for manual AC2 inspection | N/A |

</frozen-after-approval>

## Code Map

- `package.json` -- add `expo-notifications` dependency
- `android/build.gradle`, `android/app/build.gradle` -- add Google Services Gradle plugin + Firebase Messaging dependency (bare-workflow native linking; no Expo config plugin — `app.json` stays minimal)
- `src/lib/fcm/types.ts` -- new: `FcmDataPayload` discriminated union per AD-3
- `src/lib/fcm/fcmClient.ts` -- new: `getFcmToken()`, `registerFcmToken(token)` (reuses `postToN8n`), `onForegroundMessage(cb)` typed listener wrapper
- `src/lib/fcm/index.ts` -- barrel export
- `src/lib/constants.ts` -- add `FCM_REGISTER_PATH = '/register-token'`
- `src/App.tsx` -- on mount, if configured (mirror `useTracerBullet.checkConfigured`), fetch + register token and attach the foreground listener (console.log only)
- `__mocks__/expo-notifications.js` -- new jest manual mock (mirrors `__mocks__/expo-secure-store.js`)
- `src/lib/fcm/fcmClient.test.ts` -- new: unit tests for the I/O matrix rows above
- `docs/docs/fcm-spike-notes.md` -- new: AC3 developer note (n8n FCM node config, credential type, payload shape, registration-token approach — placeholders only)
- Reuse, unchanged: `src/lib/api/n8nClient.ts` (`postToN8n`), `src/lib/storage/secureStore.ts` (`AUTH_SECRET_KEY`, `readSecureItem`), `src/store` (`useSettingsStore`)

## Tasks & Acceptance

**Execution:**
- [x] `package.json`, `android/build.gradle`, `android/app/build.gradle` -- add `expo-notifications` + native Firebase Messaging wiring -- required before any FCM token can be read on Android
- [x] `src/lib/fcm/types.ts` -- define `FcmDataPayload` union (`round_trip_result` | `invoice_unknown` | `invoice_known`) -- establishes the AD-3 contract other Epic 2/6 stories consume
- [x] `src/lib/fcm/fcmClient.ts` -- implement `getFcmToken`, `registerFcmToken`, `onForegroundMessage` -- the spike's actual transport logic (AC4)
- [x] `src/lib/constants.ts` -- add `FCM_REGISTER_PATH` -- named constant, not a magic string in the client
- [x] `src/App.tsx` -- wire startup registration + foreground console-log listener -- gives a manual verification point for AC1/AC2 without building UI
- [x] `__mocks__/expo-notifications.js`, `src/lib/fcm/fcmClient.test.ts` -- unit-test the I/O matrix -- registration must be provably correct without a real device
- [x] `docs/docs/fcm-spike-notes.md` -- write the developer note -- satisfies AC3, placeholders only
- [ ] Manual: build an Android debug/App Distribution build, configure a real n8n test workflow with an FCM node, trigger it, confirm the push arrives on a real device and its `data.type` field is visible in Logcat/console -- satisfies AC1, AC2, AC5

**Acceptance Criteria:**
- Given a real Android device with the app installed and a valid n8n connection configured, when a manually-triggered n8n FCM test workflow fires, then the push is delivered and visible on the device, and its `data` payload contains a `type` field.
- Given the spike is complete, when the developer note is written, then it documents the n8n FCM node's credential type, payload shape, and device-registration approach using placeholders only — no real server keys or tokens.
- Given a valid FCM token is obtained, when the app starts, then it is POSTed to `{webhookUrl}${FCM_REGISTER_PATH}` with `Authorization: Bearer <secret>`.
- Given FCM delivery cannot be confirmed on a real device, when that failure is identified, then work stops and the transport strategy is revisited before any other Epic 2 story begins (process note — no code artifact).

## Design Notes

`registerFcmToken` takes the token as a parameter rather than calling `getFcmToken()` itself, so the same function serves both the startup call and a future `onTokenRefresh` callback (Story 2.4) without duplicating the POST logic. `onForegroundMessage` wraps `expo-notifications`' `addNotificationReceivedListener` and narrows the payload to `FcmDataPayload` at the boundary — callers (here, just `App.tsx`'s `console.log`) never touch the untyped native event shape.

## Verification

**Commands:**
- `pnpm lint` -- no new violations
- `pnpm typecheck` -- passes, including `FcmDataPayload` usage
- `pnpm test:unit -- fcmClient` -- all new tests pass

**Manual checks (if no CLI):**
- Real Android device, Firebase App Distribution build: trigger the n8n test FCM workflow, confirm the notification appears and Logcat/console shows the `data.type` field on receipt.
- Confirm `android/app/google-services.json` is never `git status`-visible as staged/committed.

## Suggested Review Order

**Transport logic (`lib/fcm/`)**

- Entry point: exception-safe permission request + raw FCM token read; never throws, resolves `null` on any denial or native error.
  [`fcmClient.ts:26`](../../src/lib/fcm/fcmClient.ts#L26)

- Registers the device token with n8n, reusing the shared bearer-auth client; strips a trailing slash before joining the path.
  [`fcmClient.ts:67`](../../src/lib/fcm/fcmClient.ts#L67)

- Foreground listener narrows the untyped native event to `FcmDataPayload`, skipping data-less notifications instead of casting blindly.
  [`fcmClient.ts:88`](../../src/lib/fcm/fcmClient.ts#L88)

- The AD-3 discriminated union this spike establishes — only `round_trip_result` is consumed yet, but all three shapes exist now.
  [`types.ts:29`](../../src/lib/fcm/types.ts#L29)

- Named constant for the registration path, avoiding a magic string at the one call site that treats `webhookUrl` as a base.
  [`constants.ts:17`](../../src/lib/constants.ts#L17)

**App-shell wiring (`App.tsx`)**

- Startup effect: guards on configured webhook+secret, fetches/registers the token, and attaches the foreground listener with proper unmount cancellation.
  [`App.tsx:38`](../../src/App.tsx#L38)

- The actual registration call site — argument order (`token, webhookUrl, secret`) is the one thing most likely to regress silently.
  [`App.tsx:61`](../../src/App.tsx#L61)

- Foreground listener attachment and its console-log-only inspection point (no Confirmation Card wiring yet, by design).
  [`App.tsx:78`](../../src/App.tsx#L78)

**Native Android wiring**

- Runtime notification permission, required on Android 13+/targetSdk 36 since this project bypasses Expo's config-plugin auto-merge.
  [`AndroidManifest.xml:10`](../../android/app/src/main/AndroidManifest.xml#L10)

- Firebase BoM + Messaging dependency, added directly rather than via a config plugin (`app.json` stays minimal).
  [`build.gradle:162`](../../android/app/build.gradle#L162)

- `google-services` plugin classpath and its application — reads the gitignored, developer-supplied `google-services.json`.
  [`build.gradle:22`](../../android/build.gradle#L22) · [`build.gradle:171`](../../android/app/build.gradle#L171)

**Developer note (AC3)**

- Reproduction steps for the n8n-side FCM setup, all placeholder values; clarifies foreground vs. background test-send behavior.
  [`fcm-spike-notes.md:1`](../../docs/docs/fcm-spike-notes.md#L1)

**Tests and mocks (peripheral)**

- End-to-end startup-wiring coverage — the one test that would actually catch an `App.tsx` call-site regression.
  [`App.test.tsx:103`](../../src/App.test.tsx#L103)

- Unit coverage for the full I/O matrix: permission states, registration success/failure, payload narrowing.
  [`fcmClient.test.ts:43`](../../src/lib/fcm/fcmClient.test.ts#L43)

- Manual `expo-notifications` mock, mirroring the existing `expo-secure-store` mock pattern.
  [`expo-notifications.js:1`](../../__mocks__/expo-notifications.js#L1)
