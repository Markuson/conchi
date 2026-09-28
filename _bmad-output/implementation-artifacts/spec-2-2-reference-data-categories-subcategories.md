---
title: 'Story 2.2: Reference Data — Categories & Subcategories'
type: 'feature'
created: '2026-09-16'
status: 'done'
baseline_commit: 'ae006f48c39259b3a25c4cbebbf7d11f9bfc9b60'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `store/referenceData.ts` is a Story-2.2-labeled stub with flat `categories: string[]`/`subcategories: string[]` arrays (no category→subcategory relationship) and an unrestricted `setReferenceData` any file can call — it can't yet back Story 2.3's category-filtered-subcategory picker, and AD-16's "`features/settings/` is the sole writer" rule has no enforcement.

**Approach:** Restructure the slice to `categories: { name, subcategories }[]`, hydrate it synchronously from an MMKV JSON cache at module load (mirroring `settingsStore.ts`), and add a `features/settings/` fetch function that populates it from n8n on startup, caches the result, and retries once on failure without crashing. Lock `setReferenceData` to `features/settings/**` via an ESLint import restriction (AD-16), mirroring the existing AD-2 `no-restricted-imports` pattern.

## Boundaries & Constraints

**Always:**
- `setReferenceData` is never imported outside `src/features/settings/**` — enforced by ESLint, not just convention.
- The store hydrates synchronously from the MMKV cache at module load; first render never blocks on network (mirrors `settingsStore.ts`'s `safeGetString` guard).
- The categories fetch reuses `postToN8n` (AD-5 bearer header injected there, never rebuilt here).
- A fetch failure never crashes the app: existing cached/empty state stays visible, one retry is scheduled via a named constant delay.

**Ask First:**
- No n8n categories endpoint or response shape is documented anywhere (flagged unresolved in the architecture's adversarial review). Assumption to confirm before coding: path `/get-categories` joined onto `webhookUrl` (AD-15, mirrors `/register-token`), POST method (matches every existing n8n call), response body `{ categories: { name: string; subcategories: string[] }[]; contexts: string[] }` — identical to the internal store shape, no translation layer.

**Never:**
- No manual "refresh" button in Settings UI this story (not required by this story's ACs); `fetchReferenceData()` is exported so a future refresh trigger can call it.
- No Drum Roller component or any UI consuming this data (Story 2.3).
- No `contexts` write path yet (Epic 5) — `contexts` is fetched/cached/read like categories but nothing populates or edits it beyond what n8n returns.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First launch, fetch succeeds | No MMKV cache, valid `webhookUrl`+secret | Store populated from n8n response; MMKV cache written | N/A |
| Subsequent launch | MMKV cache present | Store hydrates from cache synchronously, before any fetch resolves; a fetch still runs but isn't required to render | N/A |
| Not configured | No `webhookUrl` or secret | Fetch skipped entirely (mirrors `useTracerBullet`'s `checkConfigured` pattern) | Logged only |
| Fetch fails, no cache | Network/HTTP error, first launch | Store stays at empty arrays; app renders normally | One retry scheduled via `REFERENCE_DATA_RETRY_DELAY_MS`; logged |
| Fetch fails, cache exists | Network/HTTP error, subsequent launch | Store keeps the cached (stale) data | One retry scheduled; logged |

</frozen-after-approval>

## Code Map

- `src/lib/types/referenceData.ts` -- new: `Category = { name: string; subcategories: string[] }`, barrel-exported from `src/lib/types/index.ts` (mirrors `entry.ts`/`analytics.ts`)
- `src/lib/constants.ts` -- add `CATEGORIES_PATH = '/get-categories'` (mirrors `FCM_REGISTER_PATH`/`SEND_EXPENSE_PATH`, lines 17-18)
- `src/lib/storage/mmkv.ts` -- add `getObject<T>`/`setObject<T>` JSON helpers (mirror `getString`/`setString`, lines 10-16); no feature-specific keys here (module doc, lines 3-7)
- `src/lib/api/n8nClient.ts` -- reuse `postToN8n` (lines 34-51) + `joinWebhookUrl` (lines 29-32) unchanged for the categories fetch
- `src/store/referenceData.ts` -- restructure the existing stub (currently flat arrays + unrestricted setter, lines 8-20): nest `categories: Category[]`; hydrate from `getObject` at module load, guarded like `settingsStore.ts`'s `safeGetString` (lines 28-34, 43-48); export `setReferenceData` as a plain named export (not part of the hook's returned state) for the ESLint rule below to target
- `src/features/settings/referenceDataFetch.ts` -- new: `fetchReferenceData()` -- POSTs to `joinWebhookUrl(webhookUrl, CATEGORIES_PATH)`, writes the MMKV cache + calls `setReferenceData` on success; on failure, schedules one retry via `REFERENCE_DATA_RETRY_DELAY_MS`, never throws
- `src/App.tsx` -- extend the Story 2.1 startup effect (lines 38-96) with a `fetchReferenceData()` call, same `cancelled`-guard pattern
- `.eslintrc.js` -- add a `no-restricted-imports` pattern restricting the `setReferenceData` named import to `src/features/settings/**`, layered onto the existing AD-2 override structure (lines 53-68, 73-87) — new per-export enforcement, no existing precedent to copy verbatim
- `docs/docs/n8n-webhook-setup.md` -- append a section documenting the assumed categories-endpoint contract (path + JSON shape), mirroring its existing "Note on the payload shape (today)" section — placeholders only
- `src/store/referenceData.test.ts`, `src/features/settings/referenceDataFetch.test.ts` -- new: mirror `settingsStore.test.ts`'s hoisted-mock + `jest.resetModules()` pattern for hydration, and `fcmClient.test.ts`'s `postToN8n` mock for the fetch call

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/types/referenceData.ts` -- add `Category` type, barrel export -- gives the nested shape a name other files import
- [x] `src/lib/constants.ts` -- add `CATEGORIES_PATH` -- named path constant, matches existing convention
- [x] `src/lib/storage/mmkv.ts` -- add `getObject`/`setObject` -- JSON cache read/write, no existing helper covers structured data
- [x] `src/store/referenceData.ts` -- restructure to nested `categories: Category[]`, MMKV-hydrated, `setReferenceData` as separate export -- fixes the stub's flat-array/unrestricted-writer gaps
- [x] `src/features/settings/referenceDataFetch.ts` -- implement `fetchReferenceData()` with fetch/cache/retry -- the story's actual data-loading logic
- [x] `src/App.tsx` -- call `fetchReferenceData()` from the startup effect -- triggers first-launch fetch and subsequent-launch background refresh
- [x] `.eslintrc.js` -- restrict `setReferenceData` import to `src/features/settings/**` -- makes AD-16's "sole writer" rule a compile/lint-time guarantee, not a convention
- [x] `docs/docs/n8n-webhook-setup.md` -- document the categories endpoint contract -- lets a human wire the real n8n workflow node
- [x] `src/store/referenceData.test.ts`, `src/features/settings/referenceDataFetch.test.ts` -- unit-test the I/O matrix rows above

**Acceptance Criteria:**
- Given `setReferenceData` is imported from any file outside `src/features/settings/**`, when `pnpm lint` runs, then ESLint reports an error.
- Given cached reference data exists in MMKV, when the app launches, then `useReferenceDataStore`'s initial state reflects the cache before any network call resolves.
- Given any feature file reads `useReferenceDataStore`, when it calls the hook, then only `categories`/`contexts` state is available — no setter is part of the hook's return value.

## Design Notes

The category data shape was previously undefined (flagged in the architecture's adversarial review) — this spec resolves it as `{ name, subcategories: string[] }` per category, matching the `Entry` type's string-based `category`/`subcategory` fields (no IDs) and directly supporting Story 2.3's "subcategory options filtered by selected category" requirement without a lookup table.

`setReferenceData` stays a plain exported function (not folded into `useReferenceDataStore`'s returned object) specifically so the ESLint `importNames` restriction can target it by name — folding it into the hook's state would make the restriction unenforceable, since every reader would need the same import.

## Verification

**Commands:**
- `pnpm lint` -- no new violations; a deliberate test import of `setReferenceData` from outside `features/settings/` should fail lint (verify manually, don't commit it)
- `pnpm typecheck` -- passes, including the new `Category` type usage
- `pnpm test:unit -- referenceData` -- all new tests pass

**Manual checks (if no CLI):**
- Confirm `docs/docs/n8n-webhook-setup.md`'s new section contains no real URLs or secrets, matching the rest of the file.

## Suggested Review Order

**Reference-data slice: shape & write boundary**

- Nested `categories: Category[]` shape (fixes the flat-array stub) and MMKV-hydrated state.
  [`store/referenceData.ts:16`](../../src/store/referenceData.ts#L16)

- `setReferenceData` exported separately from the hook's state — the target the AD-16 lint rule locks down.
  [`store/referenceData.ts:60`](../../src/store/referenceData.ts#L60)

- `Category` type: string-based (no IDs), matching `Entry`'s own `category`/`subcategory` fields.
  [`lib/types/referenceData.ts:8`](../../src/lib/types/referenceData.ts#L8)

- The write-boundary enforcement itself: `setReferenceData` restricted to `features/settings/**` at lint time.
  [`.eslintrc.js:43`](../../.eslintrc.js#L43)

**Fetch, validate, cache, retry**

- `fetchReferenceData` entry point — POSTs, hydrates the store, caches, retries once on any failure.
  [`referenceDataFetch.ts:30`](../../src/features/settings/referenceDataFetch.ts#L30)

- Runtime shape guard on the parsed response — a malformed n8n reply is treated as a failure, not cast blindly.
  [`referenceDataFetch.ts:52`](../../src/features/settings/referenceDataFetch.ts#L52)

- In-memory store update runs before the MMKV cache write, so a cache-write failure never undoes a successful fetch.
  [`referenceDataFetch.ts:107`](../../src/features/settings/referenceDataFetch.ts#L107)

- JSON cache read/write helpers layered onto the existing string-only MMKV wrapper.
  [`lib/storage/mmkv.ts:45`](../../src/lib/storage/mmkv.ts#L45)

- Named path/retry-delay constants, matching the existing `FCM_REGISTER_PATH` convention.
  [`lib/constants.ts:19`](../../src/lib/constants.ts#L19)

**Startup wiring**

- Reference-data fetch kicked off from the same startup effect as Story 2.1's FCM registration.
  [`App.tsx:49`](../../src/App.tsx#L49)

**Documentation**

- The assumed `/get-categories` contract (path, method, response shape) for a human to wire up in n8n.
  [`n8n-webhook-setup.md:95`](../../docs/docs/n8n-webhook-setup.md#L95)

**Peripherals**

- [`store/referenceData.test.ts`](../../src/store/referenceData.test.ts) — hydration/default/corrupted-cache coverage.
- [`referenceDataFetch.test.ts`](../../src/features/settings/referenceDataFetch.test.ts) — fetch/cache/retry/shape-guard coverage.
- [`lib/types/index.ts:3`](../../src/lib/types/index.ts#L3) — barrel export for `Category`.
- [`App.test.tsx`](../../src/App.test.tsx) — mocks `fetchReferenceData` so existing FCM tests don't trigger a real network call.
