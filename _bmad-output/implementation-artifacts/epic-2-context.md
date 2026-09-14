# Epic 2 Context: Core Expense Entry, Confirmation & Basic Home List

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Turn the Epic 1 tracer bullet into a real daily-driver: Marc can log an expense from inside the app by text, photo, or PDF; see Conchita's categorized result on a production Confirmation Card; browse confirmed entries in a basic month-grouped Home list; and get a push notification when a submission finishes in the background. This epic also stands up two pieces of cross-cutting infrastructure every later epic depends on: the FCM push channel (async result delivery + notifications) and the shared reference-data slice (categories/subcategories). By the end the app is usable daily, even though editing, deletion, animation polish, analytics, context tagging, and invoices are not yet built.

## Stories

- Story 2.1: FCM Spike — Push Delivery Validation
- Story 2.2: Reference Data — Categories & Subcategories
- Story 2.3: Confirmation Card
- Story 2.4: Text Entry — Full Round-Trip Flow
- Story 2.5: Basic Home List
- Story 2.6: Media Entry (Camera + PDF)
- Story 2.7: Background Push & Notification Settings
- Story 2.8: Offline Queue

## Requirements & Constraints

- Text entry (FAB tap) and media entry (FAB long-press radial fan: Escriure / Càmera / PDF) submit to the same endpoint and produce the same two-phase round-trip; no voice option yet.
- Phase 1 (HTTP POST in flight) and Phase 2 (n8n processing until the FCM result arrives) are distinguishable; the app stays fully interactive during Phase 2. Phase 1 failure reverts with input preserved and a retry option; Phase 2 timeout uses a named constant (`PHASE2_TIMEOUT_MS`, default 60000ms), not a magic number.
- Confirmation Card fields: amount (editable), category/subcategory Drum Rollers (subcategory filtered by category, resets on category change), description, date, currency, context Drum Roller. Context is shown only when contexts exist and otherwise fully absent — production behavior, not a stub (Epic 5 activates it). A category is required to accept; an unrecognized category from Conchita is visually flagged, not silently dropped. Delete is never available from this card.
- Home list (basic, this epic): grouped by calendar month, newest-first by `date`, month subtotal + grand total for the visible window, single-line rows, tap-to-expand accordion. No window-period filtering, swipe actions, or cascade animation yet (all Epic 3).
- File uploads go through the existing n8n → Google Drive pipeline (shared with Gmail invoices); 10 MB client-side size check rejects oversized files before any network call.
- Offline queue: max depth 5, MMKV-persisted, drains serially oldest-first on reconnect; queued media files are copied to persistent app storage (not OS temp) before enqueuing.
- Every n8n request carries `Authorization: Bearer <secret>`, stored in `expo-secure-store`, never MMKV, never committed.
- Push notification shows amount + category; tapping deep-links to the specific pre-filled Confirmation Card; the entry persists server-side regardless of whether the notification is tapped.
- Settings gains a NOTIFICACIONS section (round-trip toggle at minimum), persisted to MMKV.
- Round-trip under 5s on a good connection; list load under 1s from cache; loading state for anything over 300ms.
- Every new component here (Drum Roller, Confirmation Card, ConchiBubble, ExpenseRow, FAB, MonthSectionHeader) needs a Storybook story covering its primary states.
- UI copy is Catalan by default, in Conchita's dry/competent voice — never generic or motivational.

## Technical Decisions

- **FCM is the single async channel** for in-app results and background notifications — no SSE, no polling. `data.type` discriminates `round_trip_result` | `invoice_unknown` | `invoice_known`; the full three-type contract and dispatch bridge are defined here even though only `round_trip_result` is consumed (avoids rework in Epic 6). `lib/fcm/` exposes a typed event emitter only, never imports from `features/`; the app shell wires emitter events to feature actions and navigation. App token is POSTed to n8n's registration endpoint on startup and on `onTokenRefresh`.
- **Reference data** (categories, subcategories, later contexts) lives in `store/referenceData.ts`, a shared read-only Zustand slice. `features/settings/` is the sole writer (fetch on first launch, cache in MMKV); every other feature reads via selector only, enforced at compile time.
- **File storage**: uploads go through n8n's existing Google Drive node (shared credential with the Gmail pipeline); the app reads files directly from the returned Drive URL at view time — no n8n hop, no auth header.
- **Offline queue** owned entirely by `features/entry/offlineQueue.ts`; item shape `{ id, type: 'text'|'image'|'pdf', payload, timestamp }`; drains on netinfo's `isConnected` transition to `true`.
- **Feature-sliced architecture**: business logic and Zustand slices live in `features/*`; `components/` stays presentational with no store/API imports; screens are thin orchestrators.
- Entry shape mirrors the DB: `{ id, userId, amount, currency, category, subcategory, description, date, context?, fileUrl?, origin: 'app' }`; `userId` always required (multi-user-readiness, though V1 is single-user).
- Animations (Confirmation Card slide-up, radial fan, Conchi Bubble crossfade) use Reanimated + Gesture Handler; disabled via environment flag in Detox builds.
- Errors surface as a typed `AppError`; the Conchi Bubble switches to Error state; copy comes from the Catalan voice-copy library (`lib/conchiCopy.ts`), e.g. the `roundTripSuccess` quote array (≥5 placeholder strings) on the Confirmation Card.

## UX & Interaction Patterns

- Conchi Bubble (top-right, always visible): Idle → Working (Phase 2 starts, crossfade) → Idle on success, or Error (auto-reverts after 10s) on failure/timeout. Tap always opens Settings.
- FAB: tap opens the radial fan (Escriure / Càmera / PDF) over a semi-transparent backdrop; tap-outside or tap-FAB-again closes it without action. Shows an inline spinner during Phase 1 and blocks a second submission.
- Confirmation Card: bottom sheet, spring slide-up, amount editable via numeric keyboard, side-by-side category/subcategory Drum Rollers, inline-editable description/date, conditional context Drum Roller, attachment row when a file is present, Conchi quote line, Descartar/Acceptar buttons. "Editar" exits to the Full Edit Screen instead of saving.
- Expense Row: single line at rest (category/subcategory left, amount/date right, 📎/🏷 indicators only when applicable); tap expands an accordion with description, context, and an "Obrir" attachment link (in-app viewer). Month Section Header shows month/year and an amber subtotal.
- Home empty state: larger Conchi idle image + "Encara no hi ha despeses." + "Afegeix-ne una amb el botó +."
- Accepted entries refresh the Home list silently and appear at the top without animation in this epic (cascade animation ships in Epic 3).

## Cross-Story Dependencies

- Story 2.1 (FCM spike) gates every other story in this epic; if it fails, transport strategy must be revisited before continuing.
- Story 2.2 (reference data) must land before Story 2.3 (Confirmation Card), which reads categories/subcategories from it.
- Story 2.3 (Confirmation Card) is shared by Story 2.4 (text round-trip) and Story 2.6 (media entry).
- Story 2.6's Drive upload/read validation gate must pass before its UI is built on top.
- Story 2.8 (offline queue) depends on the submission handlers built in 2.4 and 2.6.
- Story 2.7 (notification settings) depends on the FCM infrastructure from 2.1.
- The FCM message-type contract defined here is consumed as-is by Epic 6 (Gmail invoices) — no infrastructure changes expected there.
- The Home list built here (2.5) is enhanced, not rebuilt, by Epic 3 (cascade animation, swipe-to-reveal, window filtering).
- The context Drum Roller left hidden-when-empty on the Confirmation Card is activated, not rebuilt, by Epic 5.
