---
title: 'Story 2.3: Confirmation Card'
type: 'feature'
created: '2026-09-29'
status: 'done'
baseline_commit: 'a367e2b494c9d9b06b3b80e4617d48bde318e48a'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** There is no reusable UI for reviewing Conchita's extracted entry data before it's saved. The only existing stand-in, `TracerBulletModal` (Story 1.6), is an explicitly throwaway full-screen placeholder, and no category/subcategory Drum Roller component exists yet.

**Approach:** Build `ConfirmationCard` (bottom-sheet, Reanimated spring slide-up over a semi-transparent backdrop) and a generic `DrumRoller` atom, both driven entirely by props and mock data — no store imports, no real submission or persistence. This is the reusable building block Stories 2.4/2.6 wire to the real round trip and Story 3.1 wires "Editar" to.

## Boundaries & Constraints

**Always:**
- `ConfirmationCard`/`DrumRoller` live under `src/components/**` and receive `categories`/`contexts`/entry data only as props — no `store/`/`features/` imports (AD-2, ESLint-enforced).
- Card exposes `onAccept(data)`, `onDiscard()`, `onEdit(data)` callback props only — no navigation, no persistence, no Full Edit Screen wiring (confirmed: that's Story 3.1's job).
- A category selection is required to accept: Acceptar is disabled + an inline message shown when none is selected.
- Uses existing theme tokens only: `typography.confirmationAmount`, `drumSelected`/`drumGhost`, `conchiQuote`; `colors.textTertiary` for the mismatched-category label. No raw hex, no inline style literals.
- Slide-up animation is skipped (instant) when `IS_DETOX` (`lib/constants.ts`) is true, mirroring the existing determinism convention.
- Descartar uses Button `variant="danger"`; Acceptar uses `variant="primary"` (confirmed override of `Button.tsx`'s current doc-comment mapping — update that comment).

**Ask First:**
- If installing `react-native-reanimated`/`react-native-gesture-handler` (first use in this codebase) requires a native rebuild step that isn't feasible in the current environment, confirm a fallback (e.g. RN core `Animated`) before deviating from the epic's Reanimated decision.

**Never:**
- No real n8n submission, no Home list refresh, no offline queue, no context write path — this card only renders mock/passed-in data.
- No changes to `store/referenceData.ts`'s read boundary; the card never imports the store itself.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Contexts present | `contexts` non-empty | Context Drum Roller shown, options + "—" default | N/A |
| Contexts empty | `contexts: []` | Context field/Drum Roller entirely absent | N/A |
| Category changes | User selects new category | Subcategory options filtered to that category; prior subcategory selection cleared | N/A |
| Unrecognized category | Passed `category` not in `categories` | Category Drum Roller defaults to first available category, label in `textTertiary` + ⚠️ icon; subcategory resets accordingly | N/A |
| Null/negative amount | Passed `amount` is null or negative | Field displays `0.00`, editable; negative values never shown as-is | N/A |
| No category selected | Empty/cleared category | Acceptar disabled; inline "category required" message shown | N/A |

</frozen-after-approval>

## Code Map

- `src/components/ConfirmationCard.tsx` -- new: bottom-sheet, Reanimated spring `translateY` + `Pressable` backdrop (no existing bottom-sheet precedent — `TracerBulletModal.tsx` uses RN core `Modal`, an explicit Story-1.6 throwaway, not reused)
- `src/components/atoms/DrumRoller.tsx` -- new: generic `<T extends string>` options roller, mirrors `SegmentedControl.tsx:22-26`'s generic-over-`T` pattern; uses `typography.drumSelected`/`drumGhost` (`theme/typography.ts:77-91`)
- `src/components/atoms/Button.tsx` -- reuse `variant='primary'|'danger'` unchanged for Acceptar/Descartar; update doc comment (`L16-33`) to move Descartar under the Danger row
- `src/components/atoms/TextField.tsx` -- reuse for amount (`keyboardType="decimal-pad"`) and description (`keyboardType="default"`) inline-editable fields (`TextField.tsx:27-80`, `keyboardType` already plumbed)
- `src/theme/typography.ts` -- reuse `confirmationAmount` (`L52-56`), `drumSelected`/`drumGhost` (`L77-91`), `conchiQuote` (`L99-103`); no new tokens
- `src/theme/colors.ts` -- reuse `textTertiary` (`L20`)
- `src/lib/constants.ts` -- reuse `IS_DETOX` (`L9-11`) to gate animation determinism
- `src/lib/conchiCopy.ts` -- new: `export const roundTripSuccess: string[]` (≥5 Catalan placeholder strings), plain named-export style mirroring `constants.ts`
- `src/lib/types/entry.ts` -- reference only: `Entry` shape (`L7-19`) — the card's local data type mirrors `amount/currency/category/subcategory/description/date/context`, excluding `id/userId/origin/fileUrl`
- `src/lib/types/referenceData.ts` -- reference only: `Category = {name, subcategories}` (`L8-11`) — card receives `categories: Category[]`/`contexts: string[]` as props, never via the store hook
- `package.json` -- add `react-native-reanimated`, `react-native-gesture-handler` (first story introducing them; already mandated by the epic's animation decision)
- `src/components/ConfirmationCard.stories.tsx`, `src/components/atoms/DrumRoller.stories.tsx` -- new: mirror `Button.stories.tsx:1-46`'s `Meta`/`StoryObj`/`args` pattern; global `ThemeProvider` decorator already applied (`.storybook/preview.cjs:45-54`)
- `src/components/ConfirmationCard.test.tsx`, `src/components/atoms/DrumRoller.test.tsx` -- new: mirror `Button.test.tsx`/`TextField.test.tsx`'s `react-test-renderer` + manual `ThemeProvider` wrap + `act()` pattern

## Tasks & Acceptance

**Execution:**
- [x] `package.json` -- add `react-native-reanimated`, `react-native-gesture-handler` -- required for the spring slide-up and Drum Roller gesture
- [x] `src/lib/conchiCopy.ts` -- add `roundTripSuccess` array (≥5 Catalan strings) -- backs the Conchi quote AC
- [x] `src/components/atoms/DrumRoller.tsx` -- new generic Drum Roller atom (options, selected, onChange) styled via `drumSelected`/`drumGhost` -- backs category/subcategory/currency/context pickers
- [x] `src/components/ConfirmationCard.tsx` -- bottom-sheet layout, spring slide-up + backdrop, inline-editable amount/description/date, category/subcategory/currency/(conditional)context Drum Rollers, mismatched-category warning, Acceptar disabled state, `onAccept`/`onDiscard`/`onEdit` props, `IS_DETOX` gate -- the story's core deliverable
- [x] `src/components/atoms/Button.tsx` -- update doc comment (`L16-33`) to reflect Descartar=Danger -- keeps the table accurate per the confirmed variant decision
- [x] `src/components/ConfirmationCard.stories.tsx` -- stories: context visible, context hidden, pre-filled mock data
- [x] `src/components/atoms/DrumRoller.stories.tsx` -- story for the new atom
- [x] `src/components/ConfirmationCard.test.tsx`, `src/components/atoms/DrumRoller.test.tsx` -- unit tests covering the I/O matrix rows and callback firing

**Acceptance Criteria:**
- Given the card renders, when it appears, then it slides up via Reanimated spring over a semi-transparent `Pressable` backdrop, instantly when `IS_DETOX` is true
- Given a Drum Roller field, when tapped, then it opens with the correct options and updates + closes on selection
- Given a valid category selected, when Acceptar is tapped, then `onAccept(data)` fires with current (possibly edited) values and the card dismisses
- Given Descartar is tapped, when pressed, then `onDiscard()` fires and no data is passed
- Given the "Editar" link is tapped, when pressed, then `onEdit(data)` fires with current values and the card dismisses without calling `onAccept`
- Given `pnpm storybook` runs, then `ConfirmationCard` stories show: context visible, context hidden, pre-filled mock data

### Review Findings

- [x] [Review][Patch] Coordinate the four `DrumRoller` instances (Divisa/Categoria/Subcategoria/Context) so only one is open at a time — decided: lift `open` state to `ConfirmationCard`. [`DrumRoller.tsx:46`]

- [x] [Review][Patch] Comma decimal separator is silently discarded — typing `"24,50"` (a normal Catalan input on many devices' decimal-pad keyboards) parses to `NaN`, which `clampAmount` silently zeroes to `0.00` with no error shown. [`ConfirmationCard.tsx:210`]
- [x] [Review][Patch] `clampAmount` doesn't guard `Infinity`/`-Infinity` — neither is `NaN` nor `< 0`, so either would render/submit as the literal value `Infinity`. [`ConfirmationCard.tsx:78`]
- [x] [Review][Patch] No test verifies an edited amount, description, or date actually reaches `onAccept`/`onEdit` — existing tests only assert the initial display value or submit the unedited default `BASE_DATA`. [`ConfirmationCard.test.tsx`]
- [x] [Review][Patch] `DrumRoller`'s trigger `Pressable` sets `accessibilityLabel={label}`, which overrides the accessible name derived from its `Text` child — screen readers announce only the field name ("Categoria"), never the current selection. [`DrumRoller.tsx:90`]

- [x] [Review][Defer] A category literally named `''` would collide with the "no selection" sentinel — same class of risk as the already-deferred `NO_CONTEXT` ('—') collision. [`ConfirmationCard.tsx:97`] — deferred, pre-existing-pattern risk
- [x] [Review][Defer] `DrumRoller`'s `key={option.value}` has no dedup — duplicate category/context names (reference data isn't validated for uniqueness) would collide React keys. [`DrumRoller.tsx:109`] — deferred, pre-existing
- [x] [Review][Defer] The frozen I/O matrix has no "Currency" row despite full currency-mismatch-defaulting being implemented — spec/implementation documentation gap. [`ConfirmationCard.tsx:160`] — deferred, spec documentation gap
- [x] [Review][Defer] `react-native-gesture-handler` is installed with no `GestureHandlerRootView` wired at the app root yet. [`package.json`] — deferred, pre-existing (unconsumed this story per Design Notes)
- [x] [Review][Defer] The backdrop overlay has no `accessibilityViewIsModal`-equivalent containment — screen-reader focus isn't contained to the sheet, unlike the RN `Modal` it replaces. [`ConfirmationCard.tsx:278`] — deferred, pre-existing

## Spec Change Log

- **Review loop 1 (patch findings only, no spec change):** Blind-hunter, edge-case-hunter, and verification-gap review layers ran against the diff since baseline. Two real code findings (amount-clamp bypass in `buildData()` bypassing `clampAmount`'s null/negative guard; `clampAmount` missing a `NaN` guard) and two real test-coverage gaps (unselected-context payload not asserted; mismatched-category warning-clears-on-change not asserted) were classified `patch` and auto-fixed by the implementation agent, re-verified independently (lint/typecheck/full suite green, 134/134). One stale doc-comment (`babel.config.js` naming the wrong plugin) was also patched. Five additional findings (empty-`categories` no-escape-path, stale-props-on-remount, currency-mismatch asymmetry, missing keyboard-avoidance, `NO_CONTEXT` sentinel collision risk) were classified `defer` — real but out of this story's frozen scope — and appended to `deferred-work.md`. No `intent_gap`/`bad_spec` findings; the frozen Intent/Boundaries/I-O-Matrix were not touched.

## Design Notes

`DrumRoller` is generic (`<T extends string>`) rather than four bespoke pickers, mirroring `SegmentedControl`'s existing generic-over-`T` pattern — category/subcategory/currency/context all reuse it with different `options`/`selected`/`onChange`.

The card's data prop is a local type (not the persisted `Entry`), since this story never persists anything — it stays decoupled from Entry's `id`/`userId`/`origin`/`fileUrl` fields, which are 2.4/2.6 concerns.

**Implementation deviations from the Code Map (non-frozen), with rationale:**
- **Reanimated v4, not v3** — v3's types trigger `TS2589` under this project's TypeScript 6.0.3 for any `useAnimatedStyle` call. v4 fixes this and requires New Architecture, already enabled. Added `react-native-worklets` (v4's split-out peer dep); `babel.config.js` points at its plugin, `jest.config.js` uses Reanimated's own `jest/resolver.js`.
- **`react-native-gesture-handler` installed but unconsumed** — no AC/matrix row needs a drag gesture (Drum Roller is tap-to-open); wiring `GestureHandlerRootView` in for zero test coverage was pure risk. Ready for 2.4+ to consume for a real drag-to-dismiss.
- **Amount field is a bespoke `TextInput`, not the `TextField` atom** — `TextField` hardcodes its own typography with no override hook, conflicting with the frozen boundary's requirement to use `typography.confirmationAmount` + DESIGN.md's 28px Special Elite + underline-bar spec. `TextField` is still used for Data and Descripció as specified.

## Verification

**Commands:**
- `pnpm lint` -- no new violations; confirms AD-2 (no store/features imports under `components/**`)
- `pnpm typecheck` -- passes
- `pnpm test:unit -- ConfirmationCard DrumRoller` -- all new tests pass

**Manual checks (if no CLI):**
- `pnpm storybook` -- confirm the three required `ConfirmationCard` story states render and the Drum Roller opens/selects correctly.

## Suggested Review Order

**Card design & props contract**

- Entry point: the card's data/props contract — mock-only, no store/persistence, three callbacks are its only way out.
  [`ConfirmationCard.tsx:32`](../../src/components/ConfirmationCard.tsx#L32)

- `ConfirmationCard` component body — bottom-sheet layout wiring everything below together.
  [`ConfirmationCard.tsx:130`](../../src/components/ConfirmationCard.tsx#L130)

**Amount handling (patched after review)**

- `clampAmount` now guards `null`, negative, and `NaN` — the last one fixed post-review to stop a literal `"NaN"` from rendering.
  [`ConfirmationCard.tsx:78`](../../src/components/ConfirmationCard.tsx#L78)

- `buildData()` now routes the parsed amount through `clampAmount` before emitting it — fixed post-review; previously a pasted negative value could reach `onAccept` unclamped.
  [`ConfirmationCard.tsx:207`](../../src/components/ConfirmationCard.tsx#L207)

**Category/subcategory resolution**

- `resolveCategory` — mismatch-to-first-available defaulting with a `mismatched` flag for the ⚠️ warning label.
  [`ConfirmationCard.tsx:93`](../../src/components/ConfirmationCard.tsx#L93)

- `resolveSubcategory` — clears a subcategory that doesn't belong to the current category.
  [`ConfirmationCard.tsx:107`](../../src/components/ConfirmationCard.tsx#L107)

- Accept gating: category required, mismatch-warning reset on change.
  [`ConfirmationCard.tsx:219`](../../src/components/ConfirmationCard.tsx#L219)

**New `DrumRoller` atom**

- Generic `<T extends string>` tap-to-open picker, reused for category/subcategory/currency/context.
  [`DrumRoller.tsx:38`](../../src/components/atoms/DrumRoller.tsx#L38)

- `warning` prop — closed-state label switches to `textTertiary` + ⚠️ for the mismatched-category case.
  [`DrumRoller.tsx:22`](../../src/components/atoms/DrumRoller.tsx#L22)

**`Button` variant override**

- Descartar now uses `danger` (not `secondary`) per the confirmed override — doc comment updated to match.
  [`Button.tsx:50`](../../src/components/atoms/Button.tsx#L50)

**Conchi quote copy**

- `roundTripSuccess` placeholder quote array, picked at random on mount.
  [`conchiCopy.ts:12`](../../src/lib/conchiCopy.ts#L12)

**Code review fixes (round 2)**

- `clampAmount` now also guards `Infinity`/`-Infinity` via `Number.isFinite`; a new `parseAmountText` accepts a comma decimal separator (`"24,50"`) before parsing, instead of silently zeroing it as `NaN`.
  [`ConfirmationCard.tsx:78`](../../src/components/ConfirmationCard.tsx#L78)

- Drum Rollers now coordinate: a new `openRollerLabel` state in `ConfirmationCard` + controlled `open`/`onOpenChange` props on `DrumRoller` (optional — falls back to its own internal state when omitted) ensure only one of the four rollers (Divisa/Categoria/Subcategoria/Context) is open at a time.
  [`ConfirmationCard.tsx`](../../src/components/ConfirmationCard.tsx), [`DrumRoller.tsx:38`](../../src/components/atoms/DrumRoller.tsx#L38)

- `DrumRoller`'s trigger now sets `accessibilityValue={{ text: ... }}` alongside `accessibilityLabel` — the current selection is announced to screen readers, which previously only heard the field name.
  [`DrumRoller.tsx:90`](../../src/components/atoms/DrumRoller.tsx#L90)

- [`ConfirmationCard.test.tsx:330`](../../src/components/ConfirmationCard.test.tsx#L330) onward — 4 new tests: edited amount/description/date reaching `onAccept`, comma-separator parsing, `Infinity` clamping, single-open-roller coordination.

**Peripherals**

- [`ConfirmationCard.test.tsx:253`](../../src/components/ConfirmationCard.test.tsx#L253) — new post-review test: unselected context emits `undefined`, not the `'—'` sentinel.
- [`ConfirmationCard.test.tsx:175`](../../src/components/ConfirmationCard.test.tsx#L175) — new post-review test: mismatch warning clears after a valid category is picked.
- [`ConfirmationCard.test.tsx:125`](../../src/components/ConfirmationCard.test.tsx#L125) — remaining I/O-matrix and callback-contract coverage.
- [`DrumRoller.test.tsx:55`](../../src/components/atoms/DrumRoller.test.tsx#L55) — render/open/select/warning coverage for the new atom.
- [`ConfirmationCard.stories.tsx`](../../src/components/ConfirmationCard.stories.tsx) / [`DrumRoller.stories.tsx`](../../src/components/atoms/DrumRoller.stories.tsx) — required Storybook states.
- [`babel.config.js:2`](../../babel.config.js#L2), [`jest.config.js`](../../jest.config.js), [`__mocks__/react-native-reanimated.js`](../../__mocks__/react-native-reanimated.js) — first-use Reanimated v4 toolchain wiring.
- [`package.json`](../../package.json) — new dependencies: `react-native-reanimated`, `react-native-gesture-handler` (unconsumed this story, see Design Notes), `react-native-worklets`.
