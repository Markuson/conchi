---
name: Adversarial Review — Architecture Spine
type: review
subtype: adversarial
target: ARCHITECTURE-SPINE.md
reviewer: adversarial-agent
date: 2026-08-23
verdict: conditional
---

# Adversarial Review — Conchi Architecture Spine

## Verdict: CONDITIONAL PASS

The spine establishes a coherent structure and resolves the most critical security concern (secrets), but contains five gaps that, if left unresolved, will produce incompatible units between independent builders. None are blockers that invalidate the paradigm, but each one requires a concrete resolution before story-level work begins.

---

## Finding 1 — CRITICAL: UX specifies SSE; spine chose FCM — the Settings screen is architecturally broken

**Risk: Two builders will implement different wire protocols.**

The UX spec (`EXPERIENCE.md`, section "CONNEXIÓ") defines two Settings fields:
- `URL del webhook` — n8n webhook endpoint URL
- `Endpoint SSE` — n8n SSE endpoint URL for receiving results

The Two-Phase Loading section in the UX spec explicitly describes Phase 2 as "awaiting SSE push" and the Conchi bubble states table labels the Working→Completion transition as "SSE response arrives."

The spine (AD-3) replaces SSE with FCM entirely and never mentions SSE. This is a legitimate architectural decision, but the spine does not:

1. State that the `Endpoint SSE` Settings field is **removed** and what replaces it.
2. Define what the CONNEXIÓ section of Settings contains under the FCM model. FCM registration is automatic (device token posted on startup per AD-3) — the user has no FCM endpoint to configure. Does the Settings screen now have only `URL del webhook`? Does it gain a new "Firebase Project ID" or similar field? The spine leaves this undefined.
3. Resolve the naming mismatch: `Endpoint SSE` as a label in a Settings screen that stores nothing SSE-related is a UX lie.

**A builder implementing `features/settings/` and a builder implementing the Settings screen UI will produce incompatible results** — one following the UX spec (stores two URL fields), one following AD-3 (stores one URL field + possibly FCM token logic).

**Required resolution:** The spine must explicitly state what the CONNEXIÓ settings fields are under the FCM model. Likely: only `URL del webhook` (the n8n base URL or specific webhook path). The UX spec must be updated to match, or the spine must declare the UX spec's CONNEXIÓ section superseded.

---

## Finding 2 — HIGH: Offline queue ownership and read contract are undefined

**Risk: Two builders will produce an offline queue that nothing drains.**

AD-7 places the offline queue at `features/entry/offlineQueue.ts`. The Capability Map confirms it lives in `features/entry/`. So far, unambiguous.

The spine never defines:

1. **Who reads the queue and when.** Does `useEntrySubmit` check the queue on every submission attempt? Does a `lib/` network-state listener drain it on reconnect? Does app startup drain it? There is no rule governing the drain trigger.
2. **What the queue item shape is.** The Entry shape is defined in the Consistency Conventions table, but a queued entry may differ (e.g., it might carry a `queuedAt` timestamp, a `retryCount`, or a local `pendingId`). No contract exists.
3. **Who owns "offline detection."** Is that `lib/api/` (catching fetch errors) or `features/entry/` (wrapping submission)? If two builders make different assumptions, the queue never fills or never drains.

**Required resolution:** Add a queue contract to the Consistency Conventions table: item shape, drain trigger (network-reconnect event vs. app-foreground vs. next-submit attempt), and which layer owns the network-state subscription.

---

## Finding 3 — HIGH: Confirmation feature has no contract for "entry submitted successfully"

**Risk: The confirmation feature can never reliably show the Confirmation Card.**

The flow is: `features/entry/useEntrySubmit` POSTs to n8n → n8n processes → FCM message arrives → `lib/fcm/` routes to `features/confirmation/useConfirmationCard`.

The spine (AD-3) defines the FCM message envelope: `{ notification: { title, body }, data: { type, entryId?, ... } }`.

But the spine does not define:

1. **What fields are in `data` beyond `type` and the optional `entryId`.** The Confirmation Card (per UX spec) pre-fills: Import, Categoria, Subcategoria, Data, Descripció, Context. All of these must come from the FCM payload (the app cannot re-fetch them — n8n is the sole source, and there is no defined "fetch entry by id" endpoint in the spine). If `data` only carries `entryId`, the confirmation feature must make a second HTTP call, but no such endpoint is specified.
2. **Whether `entryId` is always present or only for `round_trip_result`.** The three `data.type` values are named but their `data` payloads are not enumerated.
3. **How `features/confirmation/` gets the FCM payload.** Does `lib/fcm/` call a Zustand action directly? Emit a global event? Set a value in a shared store slice? The dependency direction (AD-2) says `lib/` cannot import `features/` — so `lib/fcm/` cannot call `features/confirmation/` actions directly. The bridge mechanism is unspecified.

**Required resolution:** Add to the Consistency Conventions table: the full `data` payload shape for each `data.type` value, and the FCM→feature dispatch mechanism (e.g., a `confirmationStore` slice that `lib/fcm/` writes to via `store/index.ts`).

---

## Finding 4 — MEDIUM: Category data has two potential owners with no clear authority

**Risk: Two builders will cache categories in different places, producing stale-read divergence.**

AD-7 states: "Categories fetched on first launch, cached in MMKV, refreshed only on explicit user action in Settings."

The Capability Map shows no `features/categories/` slice. Categories are referenced in `features/entry/` (category selection during entry), `features/analytics/` (category filter chips), and `features/settings/` (the refresh trigger). The Entry shape in Consistency Conventions includes `category` and `subcategory` as fields.

The spine does not define:

1. **Which feature owns the categories Zustand slice.** If `features/entry/` owns it, `features/analytics/` must import from a sibling feature (unclear if AD-2 permits this — it only restricts `components/`, not cross-feature imports). If `lib/` holds the cached value, it contradicts the pattern where `lib/` is data-access only.
2. **The category data shape.** `category` and `subcategory` are strings in the Entry shape, but the categories cache must be structured (e.g., `{ id, name, subcategories: { id, name }[] }`) to populate drum pickers. This shape is not defined anywhere in the spine.
3. **Who calls the n8n categories endpoint.** No categories endpoint appears in AD-4 or the Capability Map. If it exists, it is undocumented. If categories are hardcoded, the spine should say so.

**Required resolution:** Name the categories owner (a new `features/categories/` slice is the cleanest solution), define the category data shape in lib/types, and either document the n8n categories endpoint or state that categories are hardcoded constants.

---

## Finding 5 — MEDIUM: AD-5 security rule has an exploitable gap for the webhook secret

**Risk: A developer following the spine to the letter could still leak the n8n URL into the public repo.**

AD-5 correctly places the **auth secret** in `expo-secure-store`. The Consistency Conventions table confirms: "`expo-secure-store` for webhook secret; MMKV for all other settings."

AD-12 states the widget reads the webhook URL and auth secret from the App Group (iOS) / SharedPreferences (Android) — both written by the main app from `expo-secure-store` or MMKV.

The problem: the **webhook URL itself** is classified as "other settings" and therefore stored in MMKV per the Consistency Conventions. MMKV data is not encrypted by default in `react-native-mmkv`. For a self-hosted, personal-use app this is a lower risk than secret exposure, but:

1. The n8n VPS URL is Marc's personal server address. Exposing it in an unencrypted local store is a lesser concern, but the rule is silent on it.
2. More critically: the spine says "The self-hosting guide documents where credentials go without exposing Marc's values." But if a Docusaurus page shows a screenshot of the Settings screen with a real URL filled in, Marc's VPS address is in the public GitHub Pages deployment. The spine has no rule preventing this. A documentation contributor following AD-14 diligently could create this exposure.

**Required resolution:** Add a rule to AD-5 or AD-14: documentation assets (screenshots, example configs) must use placeholder values only (e.g., `https://your-n8n-server.example.com`). Optionally, elevate the webhook URL to `expo-secure-store` as well, removing the distinction.

---

## Finding 6 — LOW: AD-4 analytics filter shape clashes with UX filter chip behaviour

**Risk: The analytics feature builder and the n8n workflow builder will produce an incompatible filter contract.**

AD-4 defines the analytics request payload as `{ from, to, category, subcategory, context }`. The UX spec (Estadístiques) shows four filter chips: Periode, Categoria, Subcategoria, Context — where Subcategoria is dependent on Categoria (only shows subcategories of the selected category).

The ambiguity: `category` in the filter payload is singular (implies single-select), but the UX spec table says "Single or multi-select" for Categoria. If a builder implements multi-select category filtering in the UI and sends an array `category: string[]`, the Analytics n8n workflow (a fixed three-node SQL query with nullable params) will break. The SQL parameterisation for an array differs from a scalar.

**Required resolution:** The spine must declare whether category filter is single-select only (matching the scalar payload) or multi-select (requiring an array payload and a different SQL parameterisation strategy). The UX spec's "Single or multi-select" note should be made definitive.

---

## Finding 7 — LOW: "no navigation calls outside of screens and navigation/" is under-specified

**Risk: Two builders will place navigation calls in different locations.**

AD-9 states: "No navigation calls outside of screens and `navigation/`." But feature hooks (`features/confirmation/useConfirmationCard`) must trigger navigation after the user taps Acceptar on the Confirmation Card — the card dismisses and the entry row appears in HomeScreen. If the hook cannot call navigation, the screen must pass a callback prop. The spine does not clarify the callback-vs-direct-navigation pattern.

Similarly, FCM tap deep-linking is routed via React Navigation's linking config (in `navigation/`), but the actual navigation action on tap is triggered from `lib/fcm/` — which per AD-9 is outside `screens/` and `navigation/`. This is a contradiction in the spine's own rules.

**Required resolution:** Clarify that `lib/fcm/` deep-link routing uses the navigation ref pattern (a ref to the navigator stored in `navigation/`, accessed by `lib/fcm/` without importing from `features/`), and that feature hooks signal completion via callbacks or store state, not direct navigation calls.

---

## Summary Table

| # | Severity | Finding | Blocker? |
|---|---|---|---|
| 1 | Critical | SSE→FCM transition leaves Settings CONNEXIÓ fields undefined; UX spec unresolved | Yes — blocks settings + UX alignment |
| 2 | High | Offline queue drain trigger and item shape uncontracted | Yes — blocks offline feature story |
| 3 | High | FCM→confirmation dispatch bridge and full data payload undefined | Yes — blocks confirmation feature story |
| 4 | Medium | Category data owner, shape, and source endpoint unspecified | Yes — blocks entry + analytics category pickers |
| 5 | Medium | n8n VPS URL exposure risk via Docusaurus screenshots; no documentation asset rule | Partial — security hygiene gap |
| 6 | Low | Analytics category filter cardinality (scalar vs. array) conflicts with UX multi-select note | No — but will surface in first analytics sprint |
| 7 | Low | Navigation call prohibition contradicts lib/fcm/ deep-link tap handling | No — but will cause first cross-feature PR conflict |

---

## Required Before Story Work Begins

1. Add an explicit statement to the spine resolving the SSE→FCM transition for the Settings screen CONNEXIÓ fields, and update or supersede the UX spec CONNEXIÓ section.
2. Add to Consistency Conventions: offline queue item shape and drain trigger.
3. Add to Consistency Conventions: full FCM `data` payload per `data.type`, and the lib/fcm→store dispatch pattern.
4. Name the categories owner, define the category/subcategory type in `lib/types/`, and document or eliminate the categories n8n endpoint.
5. Add a documentation asset rule to AD-5 or AD-14 prohibiting real URLs/values in screenshots or example configs.
