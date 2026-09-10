---
title: 'Story 1.6 — Tracer Bullet: End-to-End Causal Chain'
type: 'feature'
created: '2026-09-10'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '53a10a7e0b81d6d1452069b44781097374cc84b9'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The FAB is a visually-complete but functionally no-op stub (Story 1.4), and there is no proof yet that the FAB → n8n → Conchita round-trip works end-to-end before Epic 2 builds the real Confirmation Card/FCM flow on top of it.

**Approach:** Wire the FAB tap to a minimal, unstyled full-screen modal that posts the entered text to the configured n8n webhook (reusing `postToN8n`) and displays the raw response, guarded by a "connection configured" check that redirects to Settings with a plain prompt when the webhook URL or auth secret is missing.

## Boundaries & Constraints

**Always:** Every POST carries `Authorization: Bearer <secret>` via `postToN8n` (never rebuilt elsewhere). Plain RN components only, no design tokens/colors/fonts — satisfies "no styled UI" and `no-color-literals` by construction. Typed text survives any error. All business logic lives in one new feature folder.

**Ask First:** None expected. If the webhook needs a path suffix rather than the raw base URL, HALT and ask — `validateConnection.ts` posts its ping straight to the base URL with no suffix; this story follows that precedent.

**Never:** No `Entry`-shaped body, no Confirmation Card, no FCM, no retry logic, no parsing beyond raw text display. No permanent Settings UI for the "not configured" prompt — a plain `Alert` only. Footprint stays deletable: one feature folder, one component, small call-site edits (AC8).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Not configured | webhookUrl empty or secret missing | FAB tap shows an `Alert`; dismissing it navigates to Settings | N/A |
| Empty submit | text is `''` or whitespace-only | Inline validation message shown; no POST sent | N/A |
| Happy path | valid text, 2xx response | Loading indicator, then raw response text shown | N/A |
| HTTP error | valid text, non-2xx response | Plain error message shown; typed text preserved | Message derived from response status |
| Network failure | valid text, fetch throws/times out | Plain error message shown; typed text preserved | Caught and displayed, not thrown |

</frozen-after-approval>

## Code Map

- `src/lib/storage/secureStore.ts` -- add `export const AUTH_SECRET_KEY = 'settings.authSecret'`, currently a private local const at `SettingsScreen.tsx:25`; shares the key between Settings and the tracer bullet.
- `src/screens/SettingsScreen.tsx:25` -- import the shared `AUTH_SECRET_KEY` instead of the local const; no behavior change.
- `src/features/tracerBullet/useTracerBullet.ts` -- new hook: `checkConfigured(): Promise<boolean>` (sync `useSettingsStore.getState().webhookUrl` + async `readSecureItem(AUTH_SECRET_KEY)`), `submit(text): Promise<void>` (calls `postToN8n(webhookUrl, secret, text)`; manages `status: 'idle'|'submitting'|'success'|'error'`, `responseText`, `errorMessage`), `reset()`. Only file holding business logic.
- `src/components/TracerBulletModal.tsx` -- new presentational full-screen `Modal`: `TextInput`, submit control, `ActivityIndicator` while submitting, inline empty-text validation, error/response `Text`. Props-only, no store/feature imports.
- `src/navigation/BottomNavBar.tsx:97-100,157` -- replace the no-op `handleFabPress` body with a required `onFabPress: () => void` prop, invoked from the existing `Pressable onPress`; update `BottomNavBar.test.tsx`'s render calls to pass a mock and assert the FAB (`accessibilityLabel="Acció ràpida"`) invokes it.
- `src/navigation/index.tsx` -- `MainTabs` owns `useTracerBullet()` plus local `text`/`modalVisible` state; typed `useNavigation<NavigationProp<StackParamList>>()` (pattern: `ConchiBubble.tsx:40,68`) drives the not-configured Alert's Settings redirect; renders `<TracerBulletModal>` beside `<Tab.Navigator>`; passes `onFabPress` into `<BottomNavBar>`.
- `.eslintrc.js` -- add `src/navigation/index.tsx` to the `no-restricted-imports` override array alongside `src/App.tsx`: it's now the only place assembling both the FAB's `onPress` and stack-level `useNavigation`, so it needs the same store/feature access `App.tsx` already has. `BottomNavBar.tsx` stays pure prop-driven, no exemption needed.
- new: `src/features/tracerBullet/useTracerBullet.test.ts` -- mock `postToN8n`, `readSecureItem`, `useSettingsStore`, following `validateConnection.test.ts`'s convention.
- new: `src/components/TracerBulletModal.test.tsx` -- `react-test-renderer`; empty-submit validation, loading, error, response display.
- new: `src/navigation/index.test.tsx` -- app-shell test reusing `ConchiBubble.test.tsx`'s `renderAppShell` pattern: FAB tap while unconfigured → Settings navigation; FAB tap while configured → modal → submit → response shown.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/storage/secureStore.ts` -- export `AUTH_SECRET_KEY` -- shared secret-key constant
- [x] `src/screens/SettingsScreen.tsx` -- import the shared constant -- removes duplication
- [x] `src/features/tracerBullet/useTracerBullet.ts` -- new hook: configured check + submit state machine -- isolates business logic
- [x] `src/components/TracerBulletModal.tsx` -- new unstyled modal UI -- presentational only
- [x] `src/navigation/BottomNavBar.tsx` + `.test.tsx` -- wire required `onFabPress` prop into the existing `Pressable` -- replaces the Story 1.4 no-op
- [x] `.eslintrc.js` -- add `src/navigation/index.tsx` to the store/features import override -- lets the composition root wire the hook without violating AD-2 elsewhere
- [x] `src/navigation/index.tsx` -- own tracer-bullet state, configured-check → Alert + navigate, modal rendering -- single global FAB entry point
- [x] Unit tests for `useTracerBullet.ts` and `TracerBulletModal.tsx` covering the I/O matrix -- happy path, HTTP error, network throw, empty validation
- [x] `src/navigation/index.test.tsx` -- new app-shell test for both FAB branches -- proves the end-to-end causal chain

**Acceptance Criteria:**
- Given Epic 2 replaces this flow, when the codebase is reviewed, then all tracer-bullet code is confined to `useTracerBullet.ts`, `TracerBulletModal.tsx`, and the small call-site edits listed above — deletable without touching unrelated files
- Given the FAB is tapped from either the Home or Analytics tab, when configured, then the same modal opens regardless of which tab is active (FAB behavior is global, not Home-scoped)
- Given TypeScript strict mode and the project's ESLint rules, when the new code is linted/type-checked, then it passes with zero new `any` and zero new color literals outside `theme/`

## Verification

**Commands:**
- `pnpm lint` -- expected: no new errors
- `pnpm typecheck` -- expected: clean
- `pnpm test:unit -- tracerBullet BottomNavBar navigation` -- expected: all new/updated tests pass

## Suggested Review Order

**FAB wiring & composition root**

- Entry point: the FAB tap now does something — configured-check, then Alert-redirect or modal-open, replacing the Story 1.4 no-op.
  [`index.tsx:33`](../../src/navigation/index.tsx#L33)

- `MainTabs` owns all tracer-bullet state and renders the modal beside the tab navigator so the FAB stays global across tabs.
  [`index.tsx:26`](../../src/navigation/index.tsx#L26)

- Submit/close handlers delegate to `useTracerBullet`, keeping `MainTabs` a thin composition layer.
  [`index.tsx:51`](../../src/navigation/index.tsx#L51)

- `handleClose` resets hook state and text together — the path the new "Tanca" test exercises end-to-end.
  [`index.tsx:55`](../../src/navigation/index.tsx#L55)

- `BottomNavBar` drops its no-op and takes a required `onFabPress` prop, staying pure prop-driven with no store/feature access.
  [`BottomNavBar.tsx:92`](../../src/navigation/BottomNavBar.tsx#L92)

**Tracer-bullet business logic**

- All networking/state-machine logic lives here, isolated from UI — the only file in this feature holding business logic.
  [`useTracerBullet.ts:32`](../../src/features/tracerBullet/useTracerBullet.ts#L32)

- `checkConfigured` combines a sync store read with an async secure-store read to gate the FAB without a network call.
  [`useTracerBullet.ts:37`](../../src/features/tracerBullet/useTracerBullet.ts#L37)

- `submit` drives the `idle/submitting/success/error` state machine around the shared `postToN8n` client.
  [`useTracerBullet.ts:55`](../../src/features/tracerBullet/useTracerBullet.ts#L55)

**Shared secret key (AD-2/AD-5 boundary)**

- `AUTH_SECRET_KEY` promoted from a private const in `SettingsScreen` to a shared export so both flows read/write the same key.
  [`secureStore.ts:14`](../../src/lib/storage/secureStore.ts#L14)

- `.eslintrc.js` grants `navigation/index.tsx` the same store/feature import access `App.tsx` already has, since it's now a composition root.
  [`.eslintrc.js:82`](../../.eslintrc.js#L82)

**Presentational modal**

- Minimal unstyled full-screen modal — plain RN components only, so "no design tokens" and `no-color-literals` hold by construction.
  [`TracerBulletModal.tsx:31`](../../src/components/TracerBulletModal.tsx#L31)

- The only logic here is empty-text inline validation; everything else is prop-driven.
  [`TracerBulletModal.tsx:49`](../../src/components/TracerBulletModal.tsx#L49)

**Tests (peripherals)**

- App-shell integration test proves the end-to-end causal chain: FAB → configured-check → Alert or modal → submit → response.
  [`index.test.tsx:149`](../../src/navigation/index.test.tsx#L149)

- Covers the not-configured branch redirecting to Settings.
  [`index.test.tsx:128`](../../src/navigation/index.test.tsx#L128)

- New: proves "Tanca" runs the real `handleClose`, not just the presentational component's `onClose` prop (this review's one patch).
  [`index.test.tsx:173`](../../src/navigation/index.test.tsx#L173)

- Hook unit tests cover the I/O matrix directly: configured/unconfigured, happy path, HTTP error, network failure.
  [`useTracerBullet.test.ts:76`](../../src/features/tracerBullet/useTracerBullet.test.ts#L76)

- Modal unit tests cover empty/whitespace validation, loading, error, and response display in isolation.
  [`TracerBulletModal.test.tsx:53`](../../src/components/TracerBulletModal.test.tsx#L53)

- `BottomNavBar` test narrowed to prove the `Pressable` invokes whatever `onFabPress` it's given.
  [`BottomNavBar.test.tsx:142`](../../src/navigation/BottomNavBar.test.tsx#L142)
