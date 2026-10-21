---
title: 'Story 2.4: Text Entry — Full Round-Trip Flow'
type: 'feature'
created: '2026-10-15'
status: 'done'
baseline_commit: '10a0a918536e6cc030c557a4530f3be2491cb77e'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Text entry only reaches the throwaway `TracerBulletModal` (Story 1.6); there is no real two-phase round-trip from typing an expense to seeing it confirmed on the production `ConfirmationCard` (Story 2.3, built but mounted nowhere), and the FCM `round_trip_result` payload is only `console.log`'d, never dispatched to UI.

**Approach:** Replace the tracer-bullet modal with a real "Escriure" text overlay driving Phase 1 (POST to n8n) and Phase 2 (await FCM `round_trip_result`), wire Conchi Bubble's Idle/Working/Error states to that lifecycle, and mount `ConfirmationCard` with the FCM-delivered entry data; Acceptar POSTs to the save endpoint.

## Boundaries & Constraints

**Always:**
- FAB press opens the new "Escriure" overlay at `MainTabs` (replacing `useTracerBullet`/`TracerBulletModal`), keeping the existing config-check → Alert → Settings-redirect pattern unchanged.
- New orchestration hook lives under `features/entry/`, mirrors `useTracerBullet`'s generation-counter staleness guard, and reuses `postToN8n`/`resolveConfiguredCredentials` for both Phase 1 send and the Acceptar save POST.
- Phase 2 timeout uses a named constant `PHASE2_TIMEOUT_MS = 60000` in `lib/constants.ts` — never an inline magic number.
- `ConchiBubble` gains a `state: 'idle' | 'working' | 'error'` prop (its only call site updates accordingly) with a ~200ms crossfade; `error` auto-reverts to `idle` after 10s.
- The FCM foreground `round_trip_result` message (via existing `onForegroundMessage`) dispatches into the entry hook, which maps `entry` to `ConfirmationCardData` and mounts `ConfirmationCard`, fed categories/contexts from the existing read-only `useReferenceDataStore`.
- A second submission is blocked while Phase 1 or Phase 2 is in flight; Phase 1 failure preserves the typed text and offers a retry.

**Ask First:**
- No shared `AppError` type exists anywhere in the codebase today, though `epic-2-context.md` names one. If a generic `AppError` can't be justified by this story alone, confirm using a local status union (mirroring `useTracerBullet`'s own pattern) instead before deviating from that wording.

**Never:**
- No radial fan / Càmera / PDF entry points (Story 2.6).
- No Home-list refresh after save (Story 2.5).
- No offline queue (Story 2.8).
- No Full Edit Screen destination — "Editar" only fires `onEdit`; wiring where it navigates is Story 3.1.
- No FCM `onTokenRefresh` re-registration and no `docs/docs/api-contracts.md` — both carved off to `deferred-work.md` to keep this spec scoped; a follow-up spec covers them.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Blank submit | Empty/whitespace text, submit tapped | Inline validation message; no POST sent | N/A |
| Phase 1 in flight | POST pending | FAB spinner; second submit blocked; Bubble stays Idle | N/A |
| Phase 1 success | HTTP 200 | Spinner stops; Bubble → Working; Phase 2 begins | N/A |
| Phase 1 failure | Network error / non-200 | Bubble → Error (10s); text preserved; retry shown | Local status union surfaces the failure |
| Phase 2 result (foreground) | FCM `round_trip_result` arrives | Bubble → Idle; `ConfirmationCard` mounts pre-filled | N/A |
| Phase 2 timeout | No FCM within `PHASE2_TIMEOUT_MS` | Bubble → Error (10s), Catalan copy | N/A |
| Save POST fails | Acceptar's save request errors | Card stays open, inline error, no dismiss | N/A |

</frozen-after-approval>

## Code Map

- `src/navigation/index.tsx:26-82` -- `MainTabs` mount point; replace `useTracerBullet`/`TracerBulletModal` wiring with the new hook + overlay + `ConfirmationCard` mount; keep the config-check/Alert/Settings-redirect (`L33-49`) as-is
- `src/navigation/BottomNavBar.tsx:84,156-176` -- FAB already exists; only `onFabPress` needs rewiring, no new FAB UI
- `src/features/tracerBullet/useTracerBullet.ts` -- template only: mirror its generation-counter staleness guard and `postToN8n`/`resolveConfiguredCredentials` usage
- `src/components/TracerBulletModal.tsx` -- delete; superseded by the new overlay (mirror its props-only, no-store-import shape first)
- `src/lib/api/n8nClient.ts:29-51` -- `postToN8n`/`joinWebhookUrl`, reuse for both send and save POSTs
- `src/lib/api/connection.ts:21-48` -- `resolveConfiguredCredentials`, reuse
- `src/lib/fcm/fcmClient.ts:90-99` -- `onForegroundMessage`, reuse as-is; `src/App.tsx:88-90` currently only `console.log`s the payload -- first real dispatch wiring
- `src/lib/fcm/types.ts:12-16` -- `RoundTripResultPayload { entry: Entry }`, reuse
- `src/components/ConchiBubble.tsx:28-33` (mounted `App.tsx:133`) -- Idle-only today, no props; add `state` prop + crossfade (breaking change, single call site)
- `src/components/ConfirmationCard.tsx:32-55` -- stable props contract (`onAccept`/`onDiscard`/`onEdit`); first real mount
- `src/lib/types/entry.ts:7-19` -- `Entry` shape
- `src/store/referenceData.ts:69-72` -- read-only hook for categories/contexts
- `src/lib/constants.ts:17-26` -- add `PHASE2_TIMEOUT_MS = 60000` alongside existing constants (e.g. `SEND_EXPENSE_PATH`)
- `src/lib/conchiCopy.ts:12-18` -- `roundTripSuccess` exists; add the Error-state copy string here
- `src/features/tracerBullet/useTracerBullet.test.ts`, `src/lib/fcm/fcmClient.test.ts` -- test-pattern template (`react-test-renderer` + `act()`, `jest.mock`/`requireActual` partial mocks, `__mocks__/expo-notifications.js`)

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/constants.ts` -- add `PHASE2_TIMEOUT_MS = 60000` -- named constant per AC
- [x] `src/lib/conchiCopy.ts` -- add Error-state copy (incl. "Alguna cosa ha anat malament. Torna-ho a provar.") -- backs Error state
- [x] `src/components/ConchiBubble.tsx` -- add `state: 'idle'|'working'|'error'` prop, ~200ms crossfade between the three images, 10s auto-revert-to-idle timer on `error` -- update `App.tsx:133` call site
- [x] `src/features/entry/useEntrySubmission.ts` -- new hook: Phase 1 POST, Phase 2 FCM wait (`onForegroundMessage` + `PHASE2_TIMEOUT_MS`), staleness guard mirroring `useTracerBullet`, exposes status/submit/retry/entryResult -- core orchestration
- [x] `src/components/EscriureOverlay.tsx` -- new: replaces `TracerBulletModal`; text input, blank-validation, submit wired to the hook, retry affordance on Phase 1 failure
- [x] `src/components/TracerBulletModal.tsx`, `src/components/TracerBulletModal.test.tsx` -- delete -- superseded by `EscriureOverlay`
- [x] `src/navigation/index.tsx` -- wire `useEntrySubmission`/`EscriureOverlay` + mount `ConfirmationCard` (fed by `entryResult` + `useReferenceDataStore`); `onAccept` POSTs the save request
- [x] `src/App.tsx` -- replace the `L88-90` console.log with real dispatch into the active submission hook; wire `ConchiBubble`'s `state` prop to round-trip phase
- [x] `src/features/entry/useEntrySubmission.test.ts`, `src/components/EscriureOverlay.test.tsx`, `src/components/ConchiBubble.test.tsx` -- cover the I/O matrix rows (blank validation, Phase 1 fail/retry, Phase 2 timeout)

**Acceptance Criteria:**
- Given Phase 2 is active, when the user navigates to Estadístiques or scrolls Home, then the app stays fully interactive and the Bubble stays Working across screens
- Given the FCM `round_trip_result` arrives in foreground, when received, then the Bubble returns to Idle and `ConfirmationCard` slides up pre-filled with Conchita's data
- Given Acceptar is tapped, when the save POST succeeds, then the card dismisses
- Given this story's save endpoint is reviewed, then it has been manually tested with a test client using the intended payload shape (documenting it in `docs/docs/api-contracts.md` is deferred — see `deferred-work.md`)

## Spec Change Log

- The code map didn't name a save-POST endpoint path. Added `SAVE_ENTRY_PATH = '/save-entry'` to `src/lib/constants.ts` alongside `PHASE2_TIMEOUT_MS` — Acceptar's save body is the `ConfirmationCardData` fields as-is (no `userId`/`attachmentUrl`: no client-side identity system exists yet and this story has no media); per this story's own AC, that payload shape still needs manual verification against a real n8n workflow.
- `RootNavigator`/`MainTabs` now take an `entrySubmission: UseEntrySubmissionResult` prop instead of calling the hook internally, so `App.tsx` can own a single instance shared with `ConchiBubble` (a sibling of the whole navigation tree) — `MainTabs` is mounted via `Stack.Screen`'s children-render-prop form rather than `component=`. This is a breaking change to `RootNavigator`'s signature beyond the spec's own explicitly-called-out `ConchiBubble` breaking change; `.eslintrc.js`'s AD-2 override list gained one entry, `src/navigation/index.test.tsx`, so that test can mount the real `useEntrySubmission` hook the same way `src/App.test.tsx` already does.
- The Error-state copy (`roundTripError`) has no dedicated toast/banner UI to live in — `EscriureOverlay` is already closed by the time Phase 2 fails (closes right after Phase 1 succeeds, so the user is free to navigate during Phase 2, per this story's own AC). It's surfaced as `ConchiBubble`'s accessibility label while `state === 'error'`, screen-reader-only; sighted users read the failure from the Bubble's `conchi-error.png` art switching in. Flagged as a risk below.
- Acceptar's save-POST failure banner (I/O matrix: "Card stays open, inline error, no dismiss") is a small absolutely-positioned `Text` rendered above `ConfirmationCard` in `navigation/index.tsx`, since `ConfirmationCard`'s own props contract is frozen/stable and wasn't extended with an error-display slot.

- Matrix Test Audit (step-03): the "Save POST fails" row's navigation-level behavior (card stays open, banner shown) and `resolveBubbleState`'s Bubble-state mapping (built specifically for the matrix's Idle/Working/Error rows, per its own doc comment) had zero test coverage despite the underlying hook logic being tested. Added `src/navigation/index.test.tsx`'s "a failed save POST keeps ConfirmationCard open and shows an inline error banner" and `src/App.test.tsx`'s four `resolveBubbleState` cases. No code or spec changes — coverage gap only. Full suite re-verified: lint/typecheck clean, 22 suites / 165 tests passing.
- Review loop 1 (patch findings only, no spec change): blind-hunter, edge-case-hunter, and verification-gap review layers ran against the diff since baseline, independently corroborating the same core gap — `App.tsx`'s real FCM `round_trip_result` dispatch wiring (the exact integration point this spec calls "the first real dispatch wiring") had zero test coverage, since both existing test files bypassed it (one via a direct hook call, the other asserting only that the subscription was registered). Patched: (1) `saveEntry` had no re-entrancy guard against a double-tapped Acceptar firing two concurrent save POSTs — added a `saveStatusRef` mirroring `runSubmit`'s existing `statusRef` convention; (2) `handleFabPress` checked a render-time-closed-over `isBusy` after its `await checkConfigured()`, which could read stale if `status` flipped during that await — now re-checks a live `isBusyRef` instead; (3) `App.tsx`'s foreground-message handler dropped its prior diagnostic log for non-`round_trip_result` payload types with no replacement — restored as an `else` branch. Added regression tests for all three, plus the missing FCM-wiring test itself (`App.test.tsx`, mounting the real `<App/>` via `react-native-safe-area-context`'s official Jest mock — the real `SafeAreaProvider` never resolves insets under Jest, so nothing beneath it previously mounted in this file). Two theoretical, UI-unreachable guards (`runSubmit`'s own `'ready'` check; `handleRoundTripResult`'s missing generation check) were investigated and rejected as consistent with the frozen boundary's actual wording, not bugs. Nine further findings (busy-state UI feedback, accessibility live-region, copy duplication, safe-area banner inset, crossfade interruption, and assorted test-coverage gaps) were classified `defer` — real but out of this story's frozen scope — and appended to `deferred-work.md`. No `intent_gap`/`bad_spec` findings; the frozen Intent/Boundaries/I-O-Matrix were not touched. Full suite re-verified: lint/typecheck clean, 22 suites / 169 tests passing.

## Design Notes

No shared `AppError` type exists project-wide despite `epic-2-context.md` naming one — this spec defaults to a local status union (`useTracerBullet`'s own pattern) instead of introducing a new shared type on this story's back; flagged under Ask First above.

`ConchiBubble`'s new prop is a breaking change to its API, but it has exactly one call site (`App.tsx:133`), so the update is contained.

## Verification

**Commands:**
- `pnpm lint` -- no new violations (store/features import boundaries respected)
- `pnpm typecheck` -- passes
- `pnpm test:unit -- useEntrySubmission EscriureOverlay ConchiBubble` -- new/changed tests pass

**Manual checks (if no CLI):**
- `pnpm storybook` -- if `ConchiBubble` states get stories, confirm idle/working/error render
- Submit a real text entry against a live n8n instance and confirm the save round-trip, per the story's manual-test-client AC (not automatable)

## Suggested Review Order

**Core orchestration hook**

- Entry point: the round-trip state machine — Phase 1 POST, Phase 2 FCM wait, staleness guard, save POST, all driven by one status union.
  [`useEntrySubmission.ts:71`](../../src/features/entry/useEntrySubmission.ts#L71)

- Phase 1: POST to n8n, in-flight guard, Phase 2 handoff on success.
  [`useEntrySubmission.ts:122`](../../src/features/entry/useEntrySubmission.ts#L122)

- Acceptar's save POST, now re-entrancy-guarded against a double-tap (review-loop fix).
  [`useEntrySubmission.ts:216`](../../src/features/entry/useEntrySubmission.ts#L216)

- The guard itself — a `saveStatusRef` mirroring `runSubmit`'s existing `statusRef` convention.
  [`useEntrySubmission.ts:220`](../../src/features/entry/useEntrySubmission.ts#L220)

- `handleRoundTripResult` — Phase 2's only entry point, fed by `App.tsx`'s FCM dispatch below.
  [`useEntrySubmission.ts:207`](../../src/features/entry/useEntrySubmission.ts#L207)

**FCM dispatch wiring (`App.tsx`)**

- The real dispatch: `round_trip_result` routed into the hook; other payload types now log instead of vanishing (review-loop fix).
  [`App.tsx:121`](../../src/App.tsx#L121)

- `resolveBubbleState` — the pure status→Bubble-state mapping, pulled out so the matrix's Bubble rows are independently testable.
  [`App.tsx:34`](../../src/App.tsx#L34)

- Where it's actually wired to the rendered `ConchiBubble`.
  [`App.tsx:174`](../../src/App.tsx#L174)

**Navigation wiring (`MainTabs`)**

- `handleFabPress` — config check, busy gate, overlay open/reset.
  [`index.tsx:67`](../../src/navigation/index.tsx#L67)

- The busy gate now re-checks a live ref rather than a stale render-time closure (review-loop fix for a race during the `await`).
  [`index.tsx:79`](../../src/navigation/index.tsx#L79)

- `ConfirmationCard`'s first real mount, fed by the hook's `entryResult`.
  [`index.tsx:152`](../../src/navigation/index.tsx#L152)

- The save-error banner — a sibling overlay, since `ConfirmationCard`'s own props are frozen.
  [`index.tsx:160`](../../src/navigation/index.tsx#L160)

**New `EscriureOverlay` component**

- Replaces `TracerBulletModal`: text input, blank-validation, submit/retry wiring.
  [`EscriureOverlay.tsx:36`](../../src/components/EscriureOverlay.tsx#L36)

**`ConchiBubble`'s new state machine**

- The `state` prop (breaking API change, one call site) driving the Idle/Working/Error crossfade + auto-revert.
  [`ConchiBubble.tsx:26`](../../src/components/ConchiBubble.tsx#L26)

- The crossfade effect — base layer plus fading overlay (a known cosmetic edge case on rapid state changes is deferred, see `deferred-work.md`).
  [`ConchiBubble.tsx:125`](../../src/components/ConchiBubble.tsx#L125)

**Peripherals**

- `PHASE2_TIMEOUT_MS`/`SAVE_ENTRY_PATH` named constants, following the file's existing convention.
  [`constants.ts:17`](../../src/lib/constants.ts#L17)

- `roundTripError` Catalan copy, alongside the existing `roundTripSuccess` quotes.
  [`conchiCopy.ts:12`](../../src/lib/conchiCopy.ts#L12)

- `useEntrySubmission.test.ts` — covers every I/O-matrix row plus the review-loop's new re-entrancy regression test.
  [`useEntrySubmission.test.ts`](../../src/features/entry/useEntrySubmission.test.ts)

- `index.test.tsx` — end-to-end FAB→overlay→card→save coverage, plus the review-loop's FAB-while-card-open and save-failure-banner regression tests.
  [`index.test.tsx`](../../src/navigation/index.test.tsx)

- `App.test.tsx` — the review-loop's new real-FCM-wiring tests, enabled via `react-native-safe-area-context`'s official Jest mock (the real provider never resolves insets under Jest).
  [`App.test.tsx`](../../src/App.test.tsx)

- `ConchiBubble.test.tsx` — state-prop rendering, accessibility label, auto-revert timer coverage.
  [`ConchiBubble.test.tsx`](../../src/components/ConchiBubble.test.tsx)

- `TracerBulletModal.tsx`/`.test.tsx` deleted — superseded by `EscriureOverlay`.
  [`EscriureOverlay.test.tsx`](../../src/components/EscriureOverlay.test.tsx)
