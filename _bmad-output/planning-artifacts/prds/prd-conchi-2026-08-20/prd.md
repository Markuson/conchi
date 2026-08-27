---
title: Conchi App PRD
status: final
created: 2026-08-20
updated: 2026-08-22
---

# PRD: Conchi App

## 0. Document Purpose

This PRD is the authoritative requirements contract for the Conchi app — a React Native mobile application serving as the primary interface to Conchita, Marc's self-hosted AI accountant. It is written for Marc as sole product owner and portfolio author, and for the downstream AI agents (UX designer, architect, developer) that will build from it. The document is structured with a Glossary-anchored vocabulary (§3), features grouped with globally numbered FRs nested (§4), and assumptions tagged inline and indexed at §9. All UX decisions are deferred to the UX Designer unless explicitly resolved here. All architecture decisions (transport, data model, library selection beyond those named here) are deferred to the Architect. The n8n workflow export and self-hosting setup guide are outside this PRD's scope but are a required portfolio deliverable referenced in §NFR.

---

## 1. Vision

Conchi replaces Telegram as Marc's daily interface to Conchita, his self-hosted AI accountant. Telegram works well for raw input but offers nothing beyond it: there is no way to confirm that Conchita registered an expense correctly, no way to fix a misclassification, and no way to query or visualize the history. Conchi solves all three. It keeps expense entry at least as fast as Telegram — the widget is the load-bearing component — while layering confirmation, correction, and self-serve analytics on top.

The product is built on a single causal chain: **frictionless entry → consistent data → trustworthy journal → pleasant browsing → habit**. Every feature either shortens that chain or deepens its reward. The widget ensures the habit forms. The confirmation card ensures Marc trusts the data. The analytics screen ensures the journal feels worth keeping.

Conchita's character — dry, sharp, competent in the way a 90s accountant earns competence, and quietly ironic about it — is not decoration. It is the personality that makes the app feel like a personal instrument rather than a generic finance tracker. That character must be coherent across every surface: loading copy, empty states, confirmation language, and visual identity. It is the primary differentiator from anything else in the space.

---

## 2. Target User

### 2.1 Jobs To Be Done

- **Log an expense immediately**, at the point of purchase, without breaking stride (functional)
- **Trust that Conchita got it right** without having to verify every entry (emotional)
- **Fix a mistake quickly** when Conchita does get it wrong, without friction (functional)
- **Browse household finances casually** — on the couch, at the end of the day — and understand where money went (emotional, contextual)
- **Tag expenses to a trip or event** so the context is preserved in the historical record (functional)
- **See invoices that arrived by email** reviewed, categorized, and linkable back to the PDF (functional)
- **Trust the long-term data** enough to use it for real family financial decisions (emotional)
- **Show the codebase to hiring managers** and have it reflect production-grade engineering discipline (social, professional)

### 2.2 Non-Users (V1)

- Marc's partner — near-future (V1.1), but not V1. App is single-user in V1.
- Any other household member or third party.
- Users without their own self-hosted n8n + Conchita instance (the self-hosting use case is supported in Settings, but onboarding another user is not a V1 user journey).

### 2.3 Key User Journeys

- **UJ-1. Marc logs an expense at the checkout counter via the widget.**
  - **Persona + context:** Marc, buying groceries, phone in hand as he leaves the register.
  - **Entry state:** Authenticated from a previous session. Widget is on the home screen.
  - **Path:** Taps the widget → types "35€ supermercado" → submits. Widget shows processing indicator. Conchita processes via n8n. Widget shows mini confirmation (amount, category). Push notification fires.
  - **Climax:** Marc sees that Conchita logged €35 under "Alimentación / Supermercado." He doesn't need to open the app.
  - **Resolution:** Entry is in the list. Marc walks to his car.
  - **Edge case:** Conchita returns an error. Widget shows error state with a retry button. Marc's text is preserved.

- **UJ-2. Marc logs an expense from inside the app.**
  - **Persona + context:** Marc, at home, logging a bill he forgot to log earlier.
  - **Entry state:** Authenticated. App is open on the Home screen.
  - **Path:** Taps the center FAB → types "120€ electricidad octubre" → submits. Loading indicator with Conchita voice copy appears. Confirmation card slides up.
  - **Climax:** Confirmation card shows amount, category, subcategory, description, context. Marc sees Conchita got it right.
  - **Resolution:** Marc dismisses the card. New entry animates to the top of the list.
  - **Edge case:** Marc wants to attach this to the "Casa" context. He edits the context drum roller on the card before dismissing.

- **UJ-3. Marc logs a photo of a receipt.**
  - **Persona + context:** Marc, at a restaurant, receipt in hand.
  - **Entry state:** Authenticated. App is open.
  - **Path:** Long-presses the FAB → radial fan opens → taps camera icon → takes photo → submits. Same Conchita round-trip as text.
  - **Climax:** Confirmation card shows the extracted expense. Realizes UJ-2 from this point.
  - **Resolution:** Same as UJ-2.

- **UJ-4. Marc corrects a Conchita entry.**
  - **Persona + context:** Marc, reviewing the Home list, notices "Restaurante" when it should have been "Trabajo / Comida de equipo."
  - **Entry state:** Authenticated. Home screen.
  - **Path:** Swipes left on the entry → taps Edit → Full Edit screen opens → changes category and subcategory via drum rollers → saves.
  - **Climax:** Entry updates immediately in the list with the corrected category.
  - **Resolution:** Marc is back on the Home screen. One correction down.

- **UJ-5. Marc browses his family finances on the couch.**
  - **Persona + context:** Marc, Sunday evening, curious how much the family spent on food this month.
  - **Entry state:** Authenticated. Opens the Analytics screen.
  - **Path:** Selects "Last month" filter → sees donut chart by category → taps "Alimentación" to filter the list below → scrolls the itemized list.
  - **Climax:** Marc can see the total and individual entries. He swipes the chart to see the bar breakdown by week.
  - **Resolution:** Marc closes the app satisfied. He knows where the money went.

- **UJ-6. Marc receives a Gmail invoice notification.**
  - **Persona + context:** Marc, away from home. A utility bill arrived by email.
  - **Entry state:** App in background. Push notification arrives.
  - **Path:** Taps the notification → deep-links to invoice review card → sees extracted expense data → swipes sideways to open PDF preview → confirms it's correct → assigns "Casa" context.
  - **Climax:** Invoice is confirmed and contextualized without Marc having to hunt for the PDF.
  - **Resolution:** Card is dismissed. Entry appears in the list.
  - **Edge case:** Sender is unknown. Notification arrives. Marc taps → review card → taps "Add sender" quick action → Conchita registers the sender for future automation.

- **UJ-7. Marc activates a trip context before logging holiday expenses.**
  - **Persona + context:** Marc, leaving for a weekend trip.
  - **Entry state:** Authenticated. Home screen.
  - **Path:** Taps the context indicator area → context picker opens → selects or creates "Mallorca 2026" → activates it.
  - **Climax:** Active context indicator is always visible on the Home screen.
  - **Resolution:** Every subsequent log is offered the active context. Marc opts in or out per entry.

---

## 3. Glossary

- **Conchita** — The self-hosted AI accountant backend. Runs on n8n, uses Gemini 2.5 Flash Lite for extraction, stores data in PostgreSQL, handles Gmail invoice detection. Conchi (the app) is Conchita's mobile interface.
- **Entry** — A single expense record, as stored in the `transaccions` table. Has amount, currency, category, subcategory, description, date, context (optional), and origin. The app's `origen` value is `'app'`.
- **Round-trip** — The full cycle: app sends input → n8n processes → Conchita responds with a complete structured Entry. No LLM token streaming — the response always arrives as one complete payload, not incrementally. The transport mechanism (how the app sends and how Conchita's response arrives) is an architecture decision; see OQ-12.
- **Confirmation Card** — The in-app overlay that appears after a successful Round-trip, displaying the confirmed Entry fields for review and quick-edit before dismissal.
- **Drum Roller** — An iOS time-picker–style scroll selector for closed, finite lists (category, subcategory, currency). Used in the Confirmation Card and Full Edit Screen for consistent interaction.
- **Category** — A top-level expense classification, as defined in the `categories` table. Examples: "Alimentación", "Transporte", "Trabajo". Source of truth is the DB, not the app.
- **Subcategory** — A second-level expense classification nested under a Category. Also defined in the `categories` table. The Drum Roller for subcategory is filtered by the selected Category.
- **Context** — A user-defined tag representing a trip, event, or project (e.g. "Mallorca 2026", "Reforma baño"). Persists across sessions until explicitly deactivated. Stored in the DB; referenced by Entries.
- **Active Context** — A Context that has been activated and will be offered as the default context on each new Entry until deactivated. Only one Context may be active at a time.
- **Widget** — The iOS WidgetKit / Android App Widget surface for fast expense entry from the home screen. Primary daily driver for logging.
- **Known Sender** — A Gmail sender whose invoices Conchita recognizes and processes automatically. Stored in `remitents_factura`.
- **Unknown Sender** — A Gmail sender not yet in `remitents_factura`. Triggers an always-on push notification requiring Marc's attention.
- **Home Screen Window** — The configurable time range shown on the Home screen list. Options: last calendar week (Mon–Sun), last calendar month, last 7 days, last 30 days, last N expenses (user-defined count).
- **Full Edit Screen** — The secondary screen with all Entry fields editable. Accessed from the Confirmation Card or via swipe-to-reveal Edit action.
- **Analytics Endpoint** — The backend mechanism that receives filter parameters from the app and returns structured expense data for the Analytics screen. Implementation strategy (how filters become DB queries and how the response is shaped) is an Architect decision — see OQ-13. Does not exist today; a new backend deliverable for V1.

---

## 4. Features

### 4.1 Expense Entry

**Description:** Marc logs expenses via two surfaces: the Widget (primary daily driver) and the in-app FAB (power tool). Both surfaces send input to the same n8n endpoint and produce the same Conchita Round-trip. The app supports three input modalities: natural language text, photo (camera or gallery), and PDF. Photo and PDF are routed through the existing Conchita pipeline unchanged; the app handles capture and forwards the file to the same endpoint Telegram uses today. The FAB in-app uses a press-and-hold radial fan to expose photo/PDF options without cluttering the default tap-to-text flow. When connectivity is unavailable, entries queue locally and are sent automatically on reconnect (Telegram-style); V1 is designed for a maximum of a few queued entries, not bulk offline sync.

**Functional Requirements:**

#### FR-1: Widget text entry and submission
Marc can type a natural language expense description into the Widget and submit it without opening the app. The Widget sends the text to the Conchita n8n endpoint. While processing, the Widget shows a loading indicator with Conchita voice copy if the widget platform supports dynamic text during processing [ASSUMPTION: widget platform constraints (WidgetKit / App Widget) may limit live text updates during loading; Architect to confirm feasibility]. On success, the Widget shows a mini Confirmation (amount and category). On failure, the Widget shows an error state with Conchita voice copy, the original input preserved, and a retry button.

**Platform constraint — text-only:** Widget entry is text-only. Media capture (camera, gallery, PDF upload) is not feasible on the widget surface — WidgetKit and Android App Widget do not allow presenting camera or file-picker flows from the widget extension context. This is a confirmed platform constraint, not a design choice. As a convenience, the Widget may include a secondary action that deep-links directly to the app's in-app camera screen (UX decision).

**Implementation sequencing:** The Widget is a late V1 user story. All in-app FRs (text entry, confirmation card, home list, analytics, settings) must be fully functional before widget implementation begins.

**Consequences (testable):**
- Widget submits text to the correct n8n endpoint on tap of submit.
- Widget displays a loading indicator during the Round-trip.
- Widget displays amount and category from Conchita's response on success.
- Widget displays error state with Conchita voice copy, input preserved, and retry button on failure or timeout.
- Widget does not clear input on failure.

#### FR-2: In-app text entry via FAB
Marc can tap the center FAB on the Home screen to open a text input. Submitting the text triggers the Conchita Round-trip. The Round-trip has two distinguishable phases: **Send phase** (HTTP request in flight, app → n8n endpoint) and **Process phase** (n8n workflow executing post-acknowledgement, until the response arrives). The visual and copy treatment for each phase is deferred to the UX Designer — see OQ-11. Marc's working assumption: a loading indicator for the Send phase; Conchita voice sentences cycling + animated app icon for the Process phase (the message has been accepted; Conchita is now working). On completion, the Confirmation Card appears.

[NOTE FOR PM] Two-phase loading treatment is an open UX design question (OQ-11). Consequences below are phase-agnostic and should be refined once OQ-11 is resolved.

**Consequences (testable):**
- FAB tap opens text input.
- Submission triggers the Round-trip request and shows a loading state.
- Loading state displays Conchita voice copy that cycles through phrases (minimum 2 distinct phrases).
- App icon shows a processing animation during the Round-trip.
- Confirmation Card appears on successful Round-trip completion.
- Error state is shown with Conchita voice copy, input preserved, and retry option on failure.

#### FR-3: In-app media entry via FAB radial fan
Marc can press-and-hold the center FAB to reveal a radial fan with three options: write (text, same as FR-2), photo/camera, and PDF upload. Selecting photo opens the native camera or gallery picker. Selecting PDF opens the native file picker. The selected file is forwarded to the Conchita n8n endpoint using the same file-sending path as Telegram. On completion, the Confirmation Card appears. Voice entry is not present in V1, including as a placeholder — it will be added as a fourth radial fan option in V1.1.

**Consequences (testable):**
- Long-press on FAB reveals radial fan with exactly three options: write, photo/camera, PDF upload. No voice option is present or visible.
- Photo option opens native camera or gallery picker.
- PDF option opens native file picker.
- Selected file is sent to the Conchita endpoint.
- Confirmation Card appears on success.
- Error state is shown with retry option on failure.

#### FR-4: Offline entry queuing
When Marc submits an Entry (FR-1, FR-2, or FR-3) with no network connectivity, the Entry is stored locally in a queue. When connectivity is restored, queued entries are sent to the Conchita endpoint in submission order. Marc receives the normal Confirmation Card or push notification for each queued entry as they are processed. V1 is designed for a queue depth of up to ~5 entries; no bulk offline sync is required.

**Consequences (testable):**
- Submitting without connectivity stores the entry locally and shows a "queued" indicator.
- On reconnect, queued entries are sent automatically in order.
- Confirmation Card / push notification fires for each queued entry on processing.
- Queue is cleared after successful processing.

---

### 4.2 Confirmation Card & Edit

**Description:** The Confirmation Card is the central trust-building interface. It appears in-app after every successful Round-trip. If the app is backgrounded or closed when Conchita responds, a push notification fires instead; tapping the notification deep-links into the Confirmation Card. The card shows Conchita's version of the Entry — not Marc's raw input, because Conchita independently determines category, subcategory, and description. Common fields are editable inline via Drum Rollers. A "More" button opens the Full Edit Screen for less-common edits. Delete is not available from the Confirmation Card; it requires the Full Edit Screen or swipe-to-reveal on the list. All deletes require an explicit confirmation dialog.

**Functional Requirements:**

#### FR-5: In-app Confirmation Card display
After a successful Round-trip while the app is in the foreground, a Confirmation Card slides up showing: amount, category (Drum Roller), subcategory (Drum Roller, filtered by category), description, context (Drum Roller, optional). Currency and date are shown if screen real estate allows without crowding; their exact placement is a UX decision. Conchita's voice copy is present in the card's peripheral text. Marc can dismiss the card (saves as-is), edit inline via Drum Rollers (saves on dismiss), or tap "More" to open the Full Edit Screen.

**Consequences (testable):**
- Card appears after successful Round-trip with fields populated from Conchita's response.
- Category Drum Roller contains all values from the `categories` table.
- Subcategory Drum Roller filters to subcategories of the selected category.
- Context Drum Roller contains all non-archived Contexts.
- Dismissing the card saves the Entry as displayed.
- Editing a Drum Roller and dismissing saves the modified value.

#### FR-6: Push notification confirmation (background)
When Conchita completes a Round-trip while the app is backgrounded or closed, a push notification fires containing the confirmed Entry summary (amount, category). Tapping the notification opens the app and navigates directly to the Confirmation Card for that Entry. If the user does not tap (dismisses the notification), the Entry is still saved in the DB; the Confirmation Card is accessible by tapping the entry in the Home list.

**Consequences (testable):**
- Push notification fires on successful Round-trip when app is not in foreground.
- Notification content includes amount and category from Conchita's response.
- Tapping notification navigates to the correct Confirmation Card.
- Entry appears in the Home list regardless of whether the notification was tapped.

#### FR-7: Full Edit Screen
Marc can access the Full Edit Screen from the Confirmation Card ("More" button) or from the Home list (swipe-to-reveal Edit). The Full Edit Screen shows all Entry fields: amount (numeric input), currency (Drum Roller), category (Drum Roller), subcategory (Drum Roller), description (text input), context (Drum Roller), date (native date picker). Drum Rollers are used for all closed, finite fields, maintaining consistency with the Confirmation Card. Saving navigates back to the previous screen and updates the Entry in the list.

**Consequences (testable):**
- All Entry fields are editable on the Full Edit Screen.
- Drum Rollers are used for category, subcategory, currency, context.
- Native date picker is used for date.
- Saving persists changes and updates the Home list.
- Cancel discards changes and navigates back without mutation.

#### FR-8: Entry deletion with confirmation
Marc can delete an Entry from the Full Edit Screen or via swipe-to-reveal on the Home or Analytics list. Deletion always requires an explicit confirmation dialog before the Entry is removed. Deletion is not available directly from the Confirmation Card.

**Consequences (testable):**
- Delete action on the Full Edit Screen or swipe-to-reveal triggers a confirmation dialog.
- Confirming deletion removes the Entry from the DB and from all lists.
- Cancelling the dialog leaves the Entry unchanged.
- No delete action is present on the Confirmation Card.

---

### 4.3 Home Screen

**Description:** The Home screen is the default landing screen. It shows a scrollable list of recent expenses within the configured Home Screen Window, grouped by month with subtotals, and a grand total for the visible window at the top. The list is the source of truth from Conchita's confirmed data — it never shows optimistically cached raw input. When Marc opens the app after logging expenses in the background, new entries cascade into view bottom-to-top (oldest first) with a subtle stagger animation, reflecting Conchita's categorizations. Swipe-to-reveal on each row exposes Edit and Delete (and PDF link for invoice entries).

**Functional Requirements:**

#### FR-9: Expense list with Home Screen Window
The Home screen displays Entries within the selected Home Screen Window (configured in Settings). Window options: last calendar week (Mon–Sun), last calendar month, last 7 days, last 30 days, last N expenses (where N is a user-defined count configured in Settings). The list is grouped by calendar month with a month header and subtotal. A grand total for the full visible window is shown at the top of the screen. Entries are sorted newest-first within each month group.

**Consequences (testable):**
- List only shows entries within the configured window.
- Month header and subtotal are present for each calendar month represented.
- Grand total at top equals the sum of all visible entries.
- Changing the window in Settings updates the list immediately.
- "Last N expenses" window shows exactly N entries (or fewer if fewer exist), regardless of date span.

#### FR-10: List item anatomy
Each list item is a **single-line card** — entries never expand to multiple lines in their resting state. The data shown on that line: amount (dominant visual weight), category (secondary), subcategory (tertiary), and a short date if it fits without crowding. A context badge is shown if the Entry has a Context assigned. The UX Designer defines the exact layout, visual hierarchy, and whether a tap-to-expand or tap-to-modal detail view is warranted here (consistent with FR-15); this FR defines the data requirements and the single-line constraint.

**Consequences (testable):**
- Every list item renders as a single-line card in its resting state.
- Amount, category, subcategory are always visible on each list item.
- Context badge is present on entries with a Context and absent on entries without.
- No sensitive or non-UI data (e.g. `origen`) is shown on the list item.

#### FR-11: Post-log list update and animation
Two distinct animation cases apply:

**Foreground case (single entry, app open):** When Conchita confirms an Entry while Marc is in the app, the Confirmation Card dismisses and the new Entry slides into the top of the list immediately. One entry, one animation.

**Background case (one or more entries, app re-opened):** When Marc opens the app after one or more Entries were confirmed while backgrounded, new entries cascade into the list from the bottom upward, oldest to newest, with a fast stagger between each entry. The stagger interval is a UX spec deliverable — the UX Designer must define a specific timing value (not "subtle"). The animation triggers once per app open for the batch of pending entries.

In both cases, the list source of truth is always Conchita's confirmed response; locally typed input is never rendered in the list before confirmation.

**Consequences (testable):**
- Foreground: single confirmed entry animates to top of list on Confirmation Card dismissal.
- Background: confirmed entries cascade bottom-to-top (oldest→newest) on next app open.
- Animation stagger interval matches the value specified in the UX spec.
- No entry appears in the list before Conchita's confirmation is received.
- Entries already visible before backgrounding do not re-animate.

#### FR-12: Swipe-to-reveal actions on list items
Swiping left or right on any list item reveals the same set of action buttons: **Show** (only visible when the Entry has an associated file — PDF or image), **Edit**, and **Delete**. Both swipe directions expose identical actions; the UX Designer defines the visual layout of the reveal panel. Edit navigates to the Full Edit Screen (FR-7). Delete always triggers the confirmation dialog (FR-8). Show opens the associated file in the in-app viewer (FR-24).

**Consequences (testable):**
- Both left and right swipe reveal the same action panel.
- Edit action is present on all entries; navigates to Full Edit Screen.
- Delete action is present on all entries; always triggers the confirmation dialog before deleting.
- Show action is present only on entries with an associated file (PDF or image); it is not visible on entries without one.
- Show action opens the file in the in-app viewer.

---

### 4.4 Analytics

**Description:** The Analytics screen is the reward layer — the couch-browsing experience that makes the logging habit feel worthwhile. At the top is a unified filter bar controlling everything on the screen (graph and list). The main area is a swipeable graph (donut, pie, bar; UX may propose additional types). Below the graph is the filtered expense list. Marc can manually deselect individual entries from the list to exclude them from the graph calculation — this is a local-only session tweak, not persisted. All data is fetched by sending filter parameters to the Analytics Endpoint; the app does not perform aggregation client-side. The implementation strategy for the Analytics Endpoint is an Architect decision (see OQ-13).

**Functional Requirements:**

#### FR-13: Unified filter bar
The Analytics screen has a unified filter bar at the top. Filter dimensions: time span (date range), category, subcategory, context. Quick-access pills adjacent to the filter button allow one-tap selection of "Last month" and "Last week." Active filters are shown as persistent pill chips. Tapping the filter button opens a filter panel (modal or sheet — UX decision). All filters apply simultaneously to both the graph and the list.

**Consequences (testable):**
- Filter bar is always visible at the top of the Analytics screen.
- Selecting any filter updates both the graph and the list.
- Active filters are shown as chip pills.
- Quick pills for "Last month" and "Last week" apply the corresponding date range in one tap.
- Multiple filters can be active simultaneously.

#### FR-14: Swipeable graph
The main graph area displays expense data for the active filters. Three graph types are available in V1: donut chart, pie chart, bar chart. Marc can swipe left/right to switch between graph types. [ASSUMPTION: UX designer may add one additional graph type if it provides distinct descriptive value; final list is a UX decision.]

**Consequences (testable):**
- Graph renders data matching the active filters.
- Swiping switches graph type without losing active filters.
- All three graph types (donut, pie, bar) are implemented.
- Graph updates when filters change.

#### FR-15: Filterable expense list
Below the graph, a scrollable list of individual Entries matching the active filters is shown. Each entry is always a **single-line card** — entries never expand to multiple lines in their resting state. The data fields visible on the single line are a UX decision (amount and category/subcategory are the likely anchors; date and context badge are secondary). Description is desirable to surface but must not break the single-line constraint; the UX Designer must define a mechanism for Marc to access it without the list feeling cluttered (e.g. tap to expand an accordion below the row, or tap to open a detail modal — UX to decide). Marc can manually deselect individual entries using a checkbox or similar control; deselected entries are excluded from the graph calculation for the current session only. The deselection state resets when the screen is left or the app is backgrounded.

**Consequences (testable):**
- Every entry renders as a single-line card in its resting state; no entry occupies more than one line without user interaction.
- The UX spec defines which fields are visible on the single line.
- Tapping an entry exposes description and any additional fields via the mechanism defined in the UX spec (accordion or modal).
- List shows only entries matching all active filters.
- Deselecting an entry removes it from graph calculations immediately.
- Re-selecting an entry re-includes it in graph calculations immediately.
- Deselection state does not persist across screen navigation or app backgrounding.

#### FR-16: Analytics data fetching
When Marc opens the Analytics screen or changes a filter, the app sends a structured filter parameter payload (time span, category, subcategory, context) to the Analytics Endpoint and receives back pre-aggregated graph data and a raw entry list. The app renders from the response without performing SQL, aggregation, or calculation client-side.

**Hard constraint:** The app never connects to the PostgreSQL database directly. All data access routes through n8n — single backend principle.

**Implementation strategy — Architect decision (OQ-13).** The mechanism by which filter params become DB queries and a response is an open question. Marc's instincts for the Architect:
- **Preferred instinct: structured params → deterministic SQL in n8n.** The analytics filters are finite and well-defined (time range, category, subcategory, context). An n8n workflow node can map these programmatically to parameterized SQL without any AI. This is deterministic, predictable, and keeps all DB knowledge server-side.
- **Option: local DB replica on device.** Full data lives on the phone; queries run client-side. Offline-capable but introduces sync complexity and uncertain performance at scale. Worth evaluating but Marc is not confident in it.
- **Option: app constructs SQL, n8n executes.** Simpler n8n side, but couples the app to the DB schema and adds SQL query-building complexity to the client. Marc is unsure about this complexity.
- **Not preferred: AI agent generating SQL.** Marc explicitly does not want an AI interpreting queries to generate SQL — reliability and safety concerns. Deterministic query construction is required.

**[NOTE FOR PM]** The Analytics Endpoint (implementation strategy + API contract) is an Architect deliverable and does not exist today. The Architect must define: (a) the implementation strategy (see OQ-13), (b) the request filter param shape, (c) the response envelope for graph data and entry list. The Analytics screen cannot be implemented or tested until this contract is defined.

**Consequences (testable):**
- App sends filter parameters to the Analytics Endpoint on screen open and on every filter change.
- The app does not connect to the DB directly under any circumstances.
- Graph data is derived from the endpoint's aggregated response per the defined API contract, not client-side calculation.
- Entry list is derived from the endpoint's raw entry list response per the defined API contract.
- A loading state is shown while the request is in flight.
- An error state with a retry option is shown if the request fails.

---

### 4.5 Context Tagging

**Description:** Contexts are user-defined tags (trips, events, projects) that persist across sessions until deactivated. When a Context is Active, the app offers it as the default tag on each new Entry — but Marc opts in per entry; non-context expenses are always possible. New Contexts can be created inline during logging (mentioning a new context name triggers combined creation + assignment). Context management (create, archive, unarchive, delete) lives in Settings. Viewing and activating/deactivating Contexts is fast-access from the Home screen. Only one Context can be Active at a time.

**Functional Requirements:**

#### FR-17: Active Context indicator and picker
When a Context is Active, a persistent indicator is visible on the Home screen (always-visible badge, chip, or banner — UX decision). Tapping this indicator opens a fast context picker where Marc can deactivate the current Context, switch to another, or create a new one. The picker is not a full screen; it is a sheet, modal, or popover (UX decision).

**Consequences (testable):**
- Active Context indicator is visible whenever a Context is active.
- No indicator is shown when no Context is active.
- Tapping the indicator opens the context picker.
- Picker allows deactivate, switch, and create actions.
- Switching to a new Context deactivates the previous one.

#### FR-18: Per-entry Context opt-in
When a Context is Active, the Confirmation Card's Context Drum Roller defaults to the Active Context. Marc can change it to another existing Context, clear it (no context), or leave it as the Active Context. The Active Context is an offer, not a forced assignment. The Confirmation Card's Context Drum Roller shows existing Contexts only — creating a new Context from the Confirmation Card is not supported.

**Consequences (testable):**
- Confirmation Card Context Drum Roller defaults to the Active Context when one is active.
- Marc can change or clear the context on any individual Entry.
- No context is forced; the Drum Roller is always editable.
- No option to create a new Context is present on the Confirmation Card.

#### FR-19: Context creation surfaces
Context creation is fully user-driven and never AI-initiated. Settings (FR-20) is always a creation surface. Additional creation surfaces — most likely the Full Edit Screen (FR-7) and potentially the Active Context picker on the Home screen (FR-17) — are deferred to the UX Designer; see OQ-14. The Confirmation Card (FR-18) is explicitly excluded as a creation surface. Wherever creation is offered, behaviour is consistent: the new Context is immediately saved to the DB and available in all pickers across the app.

**Consequences (testable):**
- Context can always be created from Settings (FR-20).
- Any additional creation surface defined in the UX spec saves the new Context immediately to the DB.
- A Context created from any surface is immediately available in all pickers across the app.
- No Context creation is possible from the Confirmation Card.

#### FR-20: Context management in Settings
Marc can create, archive, unarchive, and delete Contexts from a Context management area within Settings (modal or secondary screen — UX decision). Deleting a Context that has Entries associated with it requires confirmation and removes the context reference from those Entries. Archived Contexts are hidden from pickers but their historical entries retain the context reference for analytics.

**Consequences (testable):**
- Settings provides create, archive, unarchive, and delete for Contexts.
- Archived Contexts do not appear in the Confirmation Card or context picker Drum Rollers.
- Deleting a Context with associated Entries requires a confirmation dialog.
- Archived Contexts are queryable in Analytics (historical data intact).

---

### 4.6 Gmail Invoice Flow

**Description:** Conchita monitors Gmail, detects invoices, extracts expense data, saves the PDF to Google Drive, and records the Entry in the DB. The app's role is notification and review. For Unknown Senders, a push notification always fires (Conchita needs Marc's input). For Known Senders, a push notification fires by default but can be turned off in Settings. Tapping a notification deep-links to an Invoice Review Card — structurally identical to the regular Confirmation Card with the addition of a PDF access action. Marc can add an Unknown Sender to the Known Senders list directly from the Review Card.

**Functional Requirements:**

#### FR-21: Unknown Sender push notification (always-on)
When Conchita receives a Gmail invoice from an Unknown Sender, a push notification is always sent to the app. The notification contains a summary of the detected invoice (amount, sender name if parseable). This notification cannot be disabled in Settings.

**Consequences (testable):**
- Unknown Sender invoice triggers a push notification regardless of notification settings.
- Notification includes available invoice summary data.
- Notification cannot be suppressed from Settings.

#### FR-22: Known Sender push notification (configurable)
When Conchita processes a Gmail invoice from a Known Sender, a push notification is sent by default. Marc can disable Known Sender notifications in Settings (one toggle). Disabling this toggle suppresses Known Sender notifications but does not suppress Unknown Sender notifications (FR-21).

**Consequences (testable):**
- Known Sender invoice triggers a push notification when the toggle is on (default).
- Known Sender invoice does not trigger a push notification when the toggle is off.
- Unknown Sender notifications are unaffected by this toggle.

#### FR-23: Invoice Review Card via deep link
Tapping any invoice push notification navigates to an Invoice Review Card for the corresponding Entry. The Review Card is structurally identical to the regular Confirmation Card (FR-5): amount, category Drum Roller, subcategory Drum Roller, description, context Drum Roller, currency and date if space allows. An additional PDF access action is available (see FR-24). Marc can edit fields, confirm, or navigate to the Full Edit Screen. Delete is not available from the Review Card — consistent with the regular Confirmation Card (FR-8); deletion requires the Full Edit Screen or swipe-to-reveal on the list.

**Consequences (testable):**
- Tapping invoice notification navigates to the correct Invoice Review Card.
- Review Card fields match the Confirmation Card specification (FR-5).
- All Drum Roller editing is functional on the Review Card.
- Review Card does not expose a delete action.

#### FR-24: File preview access (PDF and images)
On entries with an associated file — in the Review Card, the Home list, and the Analytics list — Marc can open the file in an in-app viewer. In the Home and Analytics lists, the trigger is the **Show** action in the swipe-to-reveal panel (FR-12, both directions). In the Review Card, the trigger is a UX decision (button, swipe, or tap — to be defined by UX Designer). The file opens in a native in-app viewer. Gmail invoice PDFs are fetched from their Google Drive URL (existing pipeline unchanged). App-uploaded files (photo receipts, PDFs via FAB) are fetched from their Google Drive URL, via the same n8n Drive pipeline used for Gmail invoice PDFs (see OQ-15, resolved).

**Consequences (testable):**
- Entries with an associated file expose a Show action; entries without one do not.
- Triggering Show opens the file in a native in-app viewer.
- PDFs are correctly fetched from their Google Drive URL.
- The Show action is accessible from the Home list, Analytics list, and Review Card.

#### FR-25: Inline Unknown Sender registration
From the Invoice Review Card for an Unknown Sender invoice, Marc can add the sender to the Known Senders list with a single quick action (button or inline input — UX decision). After adding, future invoices from that sender are treated as Known Sender and handled automatically.

**Consequences (testable):**
- Invoice Review Card for Unknown Sender includes an "Add sender" quick action.
- Triggering the action adds the sender to `remitents_factura`.
- Subsequent invoices from that sender are classified as Known Sender.

#### FR-26: Known Senders management in Settings
Marc can view, add, edit, and delete Known Senders from a Senders management area in Settings. This is the backstop for managing senders without going through an invoice notification.

**Consequences (testable):**
- Settings contains a Senders list with all Known Senders.
- Marc can add a new sender manually (name + email pattern).
- Marc can edit or delete any existing sender.
- Changes persist and immediately affect future invoice processing.

---

### 4.7 Settings & Self-Hosting Configuration

**Description:** Settings is the configuration and management hub. It is one of the three main screens. Secondary screens within Settings open as modals or pushed secondary screens (not new tabs). Settings must support the self-hosting use case: any technically capable user can point the app at their own n8n + Conchita instance by filling in connection credentials. The connection configuration fields are an architecture decision; the PRD requires that all necessary fields are present and that the app validates the connection before accepting the configuration.

**Functional Requirements:**

#### FR-27: n8n connection configuration
Marc (or any self-hoster) can configure the connection to their n8n instance from Settings. The required fields are an architecture decision (expected: base URL, API key or webhook secret, and any additional auth tokens). The app validates the connection (test ping) before accepting the configuration. A failed validation shows a descriptive error. A successful validation confirms the connection is live.

**Consequences (testable):**
- Settings exposes all fields required to connect to an n8n instance.
- Saving triggers a connection validation request.
- Successful validation confirms and stores the configuration.
- Failed validation shows an error message and does not save the configuration.
- The app uses the stored configuration for all subsequent Conchita requests.

#### FR-28: Notification toggles
Marc can configure two notification toggles in Settings: (1) All notifications off (disables all push notifications, overrides FR-22 but not FR-21 — Unknown Sender notifications are always-on by design and cannot be disabled). (2) Known Sender notifications off (disables FR-22 only).

**Consequences (testable):**
- "All notifications off" toggle suppresses all push notifications except Unknown Sender.
- "Known Sender off" toggle suppresses only Known Sender invoice notifications.
- Unknown Sender notifications (FR-21) are not suppressible by any setting.

#### FR-29: Home Screen Window configuration
Marc can set the Home Screen Window from Settings. Options: last calendar week (Mon–Sun), last calendar month, last 7 days, last 30 days, last N expenses (user sets a custom count N). The selected window is applied immediately to the Home screen list.

**Consequences (testable):**
- Settings exposes all five window options including last N expenses.
- For last N expenses, Marc can enter a custom count N; the field validates that N is a positive integer.
- Selecting any option updates the Home screen list immediately.
- The selection and any configured N value persist across app sessions.

#### FR-30: Theme selection
Marc can switch between dark and light mode from Settings. The theme applies immediately across the entire app. The typewriter font scope and any additional theme variables are UX decisions.

**Consequences (testable):**
- Settings provides a dark/light mode toggle.
- Theme change applies immediately without requiring app restart.
- Theme selection persists across sessions.

---

## 5. Non-Goals (Explicit)

- **No AI-generated insights or anomaly detection.** The app surfaces data; it does not interpret it. "You're spending too much on groceries" is not a V1 feature.
- **No voice entry (V1).** Planned for V1.1. The FAB radial fan has no voice placeholder in V1; voice will appear as a fourth radial fan option when introduced in V1.1.
- **No multi-user or partner access (V1).** Planned for V1.1 (partner only). Architecture must not block this but must not build it.
- **No reminder or nudge notifications.** No logging-streak nudges, no "you haven't logged today" alerts.
- **No structured input form.** Entry is always natural language, photo, or PDF. There is no manual form for new entries (edit is different — that's the Full Edit Screen for existing entries).
- **No budget goals, bank sync, or import.** The app is a logging and review tool, not a budget manager.
- **No export features.** Google Sheets dashboard stays in place as the existing export mechanism.
- **No retroactive bulk Context assignment.** Context can be changed entry-by-entry via the Full Edit Screen. No bulk-select-and-tag.
- **No soft-delete / trash recovery for Contexts or Entries.** Delete is permanent (with confirmation).
- **No category confidence indicator.** Not shown on Drum Rollers or anywhere in the UI.
- **Not a public SaaS product.** Self-hosting is supported but there is no cloud-hosted version, no subscription, no account creation flow.

---

## 6. MVP Scope

### 6.1 In Scope

- Widget (iOS WidgetKit + Android App Widget): text-only entry, mini confirmation, error state — media capture not feasible on widget platform (confirmed platform constraint); implemented as late V1 user story after app is fully functional
- In-app FAB: text entry (center tap), photo/camera and PDF upload (long-press radial fan — three options; no voice placeholder in V1)
- Conchita Round-trip — no LLM token streaming; response is a complete payload. Transport protocol (webhook + SSE preferred — see OQ-12) is an Architect decision; n8n flow modifications required.
- Offline entry queuing (Telegram-style, ~5 entry depth)
- Confirmation Card with Drum Roller quick-edit
- Push notification confirmation with deep-link to Confirmation Card
- Full Edit Screen (all fields)
- Entry deletion with confirmation dialog
- Home screen: expense list, Home Screen Window, monthly grouping + subtotals, grand total, post-log cascade animation, swipe-to-reveal (Edit, Delete, PDF for invoices)
- Analytics screen: unified filter bar, quick pills, swipeable graph (donut/pie/bar), filterable entry list, local-only entry deselect
- Analytics Endpoint (new backend deliverable — implementation strategy TBD by Architect, see OQ-13; hard constraint: no direct DB access from app)
- Context Tagging: Active Context indicator, per-entry opt-in, inline creation during logging, Settings management
- Gmail Invoice Flow: Unknown Sender notifications (always-on), Known Sender notifications (configurable), Invoice Review Card, PDF access, inline sender registration, Senders management in Settings
- Settings: n8n connection config, notification toggles, Home Screen Window, theme (dark/light), Senders management, Context management
- Push notification delivery infrastructure (new)
- TypeScript strict mode, Husky pre-commit hooks (lint + type check)
- Unit, component, and E2E test suite (meaningful critical-path coverage)
- GitHub Actions CI/CD: PR gate (lint + types + tests), merge-to-main Android APK → Firebase App Distribution (invite-only; public repo, private distribution; no iOS build in pipeline)
- Repo documentation: n8n workflow export + self-hosting setup guide

### 6.2 Out of Scope for MVP

- Voice entry → **V1.1**
- Partner / multi-user access → **V1.1**
- AI-generated spending insights
- Reminder / nudge notifications
- Budget goals, bank sync, import, export
- Retroactive bulk Context assignment
- App Store / Play Store submission (personal use; distributed privately via Firebase App Distribution)
- Soft-delete / trash recovery

---

## 7. Success Metrics

**Primary**

- **SM-1: Logging habit formation** — Marc logs at least one expense per day for 30 consecutive days, predominantly at or near the point of purchase (receipt in hand / leaving the place). Target: achieved within 60 days of V1 launch. Validates FR-1, FR-2, FR-3, FR-4.
- **SM-2: Data trust** — Manual corrections (edits to Conchita's category, subcategory, or amount) average ≤ 2 per week after the first 30 days. Gmail invoice entries require zero corrections. Validates FR-5, FR-6, FR-23.

**Secondary**

- **SM-3: Analytics engagement** — Marc opens the Analytics screen at least once per week for couch-browsing within 90 days of launch. Validates FR-13 through FR-16.
- **SM-4: Portfolio signal** — Repo earns at least one fork from a non-Marc account; at least one recruiter or hiring manager requests a live demo. No timeline target — ongoing.

**Counter-metrics (do not optimize)**

- **SM-C1: App opened only to correct** — If the app is being opened primarily to fix Conchita's errors rather than to browse, the trust goal (SM-2) is failing. A rising correction rate is a signal to investigate Conchita's categorization quality, not to add more UI affordances.
- **SM-C2: Analytics novelty drop-off** — If Analytics engagement peaks in the first week and falls to zero by week four, the screen is not serving the couch-browsing use case. Do not add more features to compensate; investigate the data quality and UX instead.

---

## 8. Open Questions

1. **Quick filter pills in Analytics** — "Last month" and "Last week" pills next to the filter button: exact placement, tap behavior, and whether they are mutually exclusive or can combine with other active filters. Deferred to UX Designer.
2. **Typewriter font scope** — Does the typewriter font apply everywhere in the app, or only to Conchita's own voice surfaces (loading copy, empty states, confirmation language)? Deferred to UX Designer.
3. ~~**Swipe direction for file access**~~ — **Resolved.** Both left and right swipe reveal the same action panel: Show (conditional), Edit, Delete. Direction is symmetric; UX Designer defines the visual layout of the reveal. See FR-12.
4. **Analytics graph additional types** — UX Designer may propose one additional graph type beyond donut/pie/bar if it provides distinct descriptive value. Deferred to UX Designer.
5. **Confirmation Card density threshold** — Amount, category, subcategory, description, context are required. Currency and date are added "if it fits without crowding." UX Designer defines the threshold and decides which fields make the cut on smaller screen sizes.
6. **Context picker placement** — Fast access from Home screen: sheet, modal, popover, or inline expand? Deferred to UX Designer.
7. ~~**"All notifications off" and Unknown Sender**~~ — **Resolved.** Unknown Sender notifications are always-on by design and cannot be disabled by any Settings toggle. FR-28 and FR-21 are consistent. No open question.
8. ~~**n8n connection fields**~~ — **Superseded by OQ-12.** Connection field definition is now part of the transport protocol decision. Architect to define fields once OQ-12 is resolved.
9. **Retroactive bulk Context assignment** — Not in V1. Revisit for V1.1 if partner use case reveals it as a pain point.
10. **App license** — Marc wants to allow forks for learning but prevent commercial use of the source code. License selection (e.g. CC BY-NC, BSL, or custom) is a pre-publish task outside the app build scope. Tracked in the addendum.
11. **Two-phase Round-trip loading states** — The Conchita Round-trip has a Send phase (HTTP request in flight → n8n acknowledges with a 200) and a Process phase (n8n workflow executing post-acknowledgement, until the response arrives). Marc's working assumption: loading indicator for the Send phase; Conchita voice sentences + animated app icon for the Process phase (communicating "your message landed, Conchita is on it"). If the webhook + SSE transport (OQ-12) is adopted, the phase boundary is technically detectable (POST 200 = Send complete; SSE event = Process complete). UX Designer to define: (a) whether the phase boundary is surfaced visually, (b) the specific treatment for each phase. Architect to confirm technical detectability once OQ-12 is resolved. Affects FR-2, FR-3, and FR-1 (widget, within platform constraints). Deferred to UX Designer + Architect.
12. **App-to-Conchita transport protocol** — Marc's preferred pattern: app POSTs to an n8n webhook (receives HTTP 200 immediately); n8n pushes the result back via Server-Sent Events (SSE) once Conchita finishes processing. Mirrors Telegram's interaction feel and provides a natural OQ-11 phase boundary (POST 200 = sent; SSE event = Conchita done). Requires modifications to the existing n8n flow. Architect to: (a) validate SSE feasibility from self-hosted n8n, (b) confirm or propose an alternative transport if SSE is not suitable, (c) define the n8n flow changes required, (d) define connection fields for FR-27 (supersedes OQ-8 scope). Deferred to Architect.
13. **Analytics Endpoint implementation strategy** — The app must never access the DB directly; all data flows through n8n (hard constraint). The mechanism by which analytics filter params become DB queries and a structured response is an Architect decision. Options to evaluate: (a) structured params → deterministic SQL built programmatically in an n8n workflow node — Marc's preferred instinct; filters are finite and well-defined, SQL generation is predictable, no AI involved; (b) local DB replica on device — offline-capable but sync complexity and performance at scale are uncertain; (c) app constructs SQL and sends to n8n for execution — simpler n8n side but couples app to DB schema and adds SQL query-building complexity to the client. **Explicitly not preferred:** AI-interpreted query generation — Marc requires deterministic, predictable query construction for reliability. Architect to recommend the cleanest and most efficient approach and define the API contract (request filter params + response envelope for graph data + entry list). Deferred to Architect.
14. **Context creation surfaces beyond Settings** — Where can Marc create a new Context outside of the Settings screen? Confirmed excluded: the Confirmation Card. Settings (FR-20) is always available. Candidates for UX to evaluate: (a) Full Edit Screen (FR-7) — Marc's preferred candidate; (b) Active Context picker on Home screen (FR-17) — already noted as having a "create" action. UX Designer to decide which surfaces support creation and how creation is triggered (e.g. "New context…" option at the bottom of a Drum Roller, inline text input, or a dedicated sheet). Deferred to UX Designer.
15. ~~**File storage for app-uploaded files**~~ — **Resolved (revised 2026-08-27).** App-uploaded files reuse the existing Google Drive pipeline via n8n's Drive node — no new storage backend, no additional OAuth setup, same `transaccions.drive_url` column as Gmail invoices. MinIO was built (Story 1.2) and stays available as a possible future migration if self-hosting the file store becomes a priority; see `deferred-work.md`.

---

## 9. Assumptions Index

- **§1** — Conchita's character is defined as a sharp, competent 90s accountant with dry irony (Pepper Potts archetype). No tone guide or copy library exists yet; the UX Designer will define this from scratch using this description.
- **§4.1 / FR-1** — Widget platform constraints (WidgetKit / Android App Widget) may limit live text updates during the loading state. Architect to confirm feasibility before the UX Designer specifies the loading copy behaviour.
- **§4.1 / FR-4** — Offline queue depth is ~5 entries maximum. Marc rarely logs more than a couple of entries offline in sequence.
- **§4.2 / FR-5** — The list source of truth is always Conchita's confirmed response. The app never optimistically renders Marc's raw typed input in the Home list.
- **§4.4 / FR-14** — UX designer may propose one additional graph type beyond donut/pie/bar if it provides distinct descriptive value. The final graph type list is a UX decision.
- **§4.4 / FR-16** — The Analytics Endpoint does not exist today and is a new backend deliverable for V1. Implementation strategy is an Architect decision (OQ-13); the hard constraint is no direct DB access from the app.
- **§4.6 / FR-21** — Unknown Sender notifications cannot be disabled by any user setting. Confirmed by Marc — resolved.
- **§4.7 / FR-27** — Self-hosting is a first-class use case. The app should be usable by a technically capable second user who creates their own n8n + Conchita instance and enters credentials in Settings.
- **§General** — Category and subcategory are both defined in the DB (`categories` table). Both are surfaced in all Drum Rollers; subcategory filters by selected category.
- **§General** — Marc's partner may be added as a second user in V1.1. V1 architecture must not block this but does not implement it.

---

## Aesthetic & Tone

**Conchita's voice.** Sharp, competent, dry. A 90s accountant who has seen everything and is mildly amused by your spending habits. Think Pepper Potts: efficient, slightly ahead of you, occasionally sardonic, never generic-finance-app cheerful. Conchita's copy appears in loading states during the Round-trip, empty states (no entries yet, no analytics data), Confirmation Card peripheral text, and error states. Every line should feel like it could only come from Conchita — not from a generic expense app.

**Anti-references.** Avoid: motivational tone ("You're doing great!"), emoji-heavy UI, generic financial wellness language, bright saturated colors, playful rounded shapes that read as consumer fintech.

**Visual identity direction (for UX Designer).**
- Typewriter / monospace font — scope (everywhere vs. Conchita surfaces only) is a UX decision.
- Muted, desaturated category color palette.
- Clean, minimalist layout.
- App icon has a subtle animated state while Conchita is processing (mid-round-trip).
- Drum Rollers (iOS time-picker style) as the signature interaction pattern for all closed-field edits.
- Every visual decision either reinforces or breaks the Conchita character. Treat the character as a coherent identity system, not a style guide.

---

## Information Architecture

**Three main screens:**
1. **Home** — Recent expenses list, active context indicator, FAB entry.
2. **Analytics** — Filter bar, swipeable graph, expense list.
3. **Settings** — Connection config, notifications, Home Screen Window, theme, Senders, Contexts.

**Navigation.**
- Bottom navigation bar: Settings icon (left of FAB), Home (center / FAB), Analytics (right of FAB).
- Settings opens a Settings screen; sub-sections open as modals or pushed secondary screens (not new tabs).
- No deep navigation tree. Three screens is the ceiling for main surfaces.

**Modal / sheet surfaces (not main screens):**
- Confirmation Card (slides up)
- Full Edit Screen (pushed secondary screen or modal — UX decision)
- Invoice Review Card (same as Confirmation Card)
- Context picker (sheet or popover from Home)
- Filter panel (sheet from Analytics)
- Context management (modal or secondary screen from Settings)
- Senders management (modal or secondary screen from Settings)

---

## Cross-Cutting NFRs

**TypeScript.** Strict mode across the entire codebase. No `any`. Full type coverage. Enforced by Husky pre-commit hook (lint + type check must pass before every commit).

**Code quality.** ESLint enforced at pre-commit. Lint rules to be defined by the Architect; must be compatible with strict TypeScript.

**Dependencies.** Minimal by default — add a library only if it is genuinely necessary and there is no reasonable platform-native alternative. Explicitly approved: **Zustand** (state management). Conditionally approved: **React Native Reanimated** — include if the Architect determines it is required for the animation quality the product needs (post-log cascade, Drum Rollers, transitions). All other libraries require justification.

**Performance.**
- App cold-start: under 2 seconds on a mid-range device.
- Entry-to-confirmation (Round-trip): under 5 seconds on a good mobile connection (network-dependent; app must not feel slow on its end).
- List and Analytics data load: under 1 second from cache / local; loading state shown for any request over 300ms.

**Testing.**
- Unit tests: business logic, utility functions, data transformation.
- Component tests: key UI components (Confirmation Card, Drum Roller, list items, filter bar).
- E2E tests (Detox or equivalent): golden-path journeys (UJ-1 through UJ-7). Coverage target is qualitative — meaningful critical-path coverage, not a percentage. Marc determines what is "enough."

**CI/CD (GitHub Actions).**
- PR gate: lint + type check + full test suite must pass before merge is allowed.
- Merge-to-main: **Android APK** built and distributed via **Firebase App Distribution** (invite-only; Marc's email is the sole invited tester). No iOS build in the pipeline. No store submission.

**Public repo + private distribution model.** The source code repository is public (portfolio visibility). Build artifacts are never attached to GitHub Releases — that would make the APK openly downloadable by anyone in a public repo. Firebase App Distribution is invite-only: only Marc's registered email can install the app. Signing keys, Firebase credentials, and any other secrets are stored in GitHub Secrets (never committed to the repo) and used only during the Actions workflow.

**Repo documentation (portfolio requirement).**
- n8n workflow export (JSON) committed to the repo.
- Self-hosting setup guide: covers n8n instance setup, Conchita configuration, DB schema, app Settings connection fields. Written for a technically capable audience.

**Architecture constraint: single-user V1, multi-user-ready.**
The V1 codebase serves one user (Marc). The architecture must not create structural barriers to adding a second user (partner) in V1.1. This means: no hardcoded user identity, no singleton data assumptions that would break with two users, auth layer designed to accommodate a second account even if it is not wired up in V1.

**Platform.**
- React Native (Expo or bare — Architect decision).
- iOS: WidgetKit for the Widget.
- Android: App Widget for the Widget.
- Minimum OS versions: Architect decision based on WidgetKit and App Widget API requirements.
