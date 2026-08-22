---
title: Conchi App PRD
status: final
created: 2026-08-20
updated: 2026-08-21
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
- **Round-trip** — The full request-response cycle: app sends input → n8n processes → Conchita responds with a structured Entry. No streaming. The app always waits for the complete response.
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
- **Analytics Query Agent** — A new n8n workflow that receives filter parameters from the app, generates SQL, queries the DB, and returns structured data for display.

---

## 4. Features

### 4.1 Expense Entry

**Description:** Marc logs expenses via two surfaces: the Widget (primary daily driver) and the in-app FAB (power tool). Both surfaces send input to the same n8n endpoint and produce the same Conchita Round-trip. The app supports three input modalities: natural language text, photo (camera or gallery), and PDF. Photo and PDF are routed through the existing Conchita pipeline unchanged; the app handles capture and forwards the file to the same endpoint Telegram uses today. The FAB in-app uses a press-and-hold radial fan to expose photo/PDF options without cluttering the default tap-to-text flow. When connectivity is unavailable, entries queue locally and are sent automatically on reconnect (Telegram-style); V1 is designed for a maximum of a few queued entries, not bulk offline sync.

**Functional Requirements:**

#### FR-1: Widget text entry and submission
Marc can type a natural language expense description into the Widget and submit it without opening the app. The Widget sends the text to the Conchita n8n endpoint. While processing, the Widget shows a loading indicator with Conchita voice copy if the widget platform supports dynamic text during processing [ASSUMPTION: widget platform constraints (WidgetKit / App Widget) may limit live text updates during loading; Architect to confirm feasibility]. On success, the Widget shows a mini Confirmation (amount and category). On failure, the Widget shows an error state with Conchita voice copy, the original input preserved, and a retry button.

**Consequences (testable):**
- Widget submits text to the correct n8n endpoint on tap of submit.
- Widget displays a loading indicator during the Round-trip.
- Widget displays amount and category from Conchita's response on success.
- Widget displays error state with Conchita voice copy, input preserved, and retry button on failure or timeout.
- Widget does not clear input on failure.

#### FR-2: In-app text entry via FAB
Marc can tap the center FAB on the Home screen to open a text input. Submitting the text triggers the Conchita Round-trip. During the Round-trip, a loading indicator is displayed with Conchita voice copy that cycles through multiple phrases (not a static single line). The app icon reflects the processing state with a subtle animation while the Round-trip is in progress. On completion, the Confirmation Card appears.

**Consequences (testable):**
- FAB tap opens text input.
- Submission triggers the Round-trip request.
- Loading state displays Conchita voice copy that cycles through phrases during the Round-trip (minimum 2 distinct phrases).
- App icon shows a processing animation while the Round-trip is in progress.
- Confirmation Card appears on successful Round-trip completion.
- Error state is shown with Conchita voice copy, input preserved, and retry option on failure.

#### FR-3: In-app media entry via FAB radial fan
Marc can press-and-hold the center FAB to reveal a radial fan with three options: write (text, same as FR-2), record (deferred to V1.1), photo/camera. Selecting photo opens the native camera or gallery picker. The selected image or PDF is forwarded to the Conchita n8n endpoint using the same file-sending path as Telegram. On completion, the Confirmation Card appears.

**Consequences (testable):**
- Long-press on FAB reveals radial fan with correct options.
- Photo option opens native camera or gallery picker.
- Selected file is sent to the Conchita endpoint.
- Confirmation Card appears on success.
- Error state is shown with retry option on failure.

**Out of Scope:** Record (voice) option is visible in the radial fan as a placeholder in V1 but is non-functional (tapping it shows a "coming soon" state). Voice entry is V1.1.

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
Each list item displays: amount (dominant visual weight), category (secondary), subcategory (tertiary), and a short date if space allows. A context badge is shown if the Entry has a Context assigned. The exact layout and visual hierarchy are UX decisions; this FR defines the data requirements only.

**Consequences (testable):**
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
Swiping left on any list item reveals Edit and Delete action buttons. For invoice Entries (those with an associated PDF), swiping right (or an additional swipe direction — UX decision) reveals a "View PDF" action. Edit navigates to the Full Edit Screen (FR-7). Delete triggers the confirmation dialog (FR-8).

**Consequences (testable):**
- Left swipe reveals Edit and Delete on all list items.
- Edit navigates to Full Edit Screen for the correct Entry.
- Delete triggers confirmation dialog.
- Invoice entries have a PDF access action; non-invoice entries do not.

---

### 4.4 Analytics

**Description:** The Analytics screen is the reward layer — the couch-browsing experience that makes the logging habit feel worthwhile. At the top is a unified filter bar controlling everything on the screen (graph and list). The main area is a swipeable graph (donut, pie, bar; UX may propose additional types). Below the graph is the filtered expense list. Marc can manually deselect individual entries from the list to exclude them from the graph calculation — this is a local-only session tweak, not persisted. All data is fetched by sending filter parameters to the Analytics Query Agent (n8n); the app does not perform aggregation client-side.

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
Below the graph, a scrollable list of individual Entries matching the active filters is shown. Each item shows: amount, category, subcategory, description, date. Marc can manually deselect individual entries using a checkbox or similar control; deselected entries are excluded from the graph calculation for the current session only. The deselection state resets when the screen is left or the app is backgrounded.

**Consequences (testable):**
- List shows only entries matching all active filters.
- Deselecting an entry removes it from graph calculations immediately.
- Re-selecting an entry re-includes it in graph calculations immediately.
- Deselection state does not persist across screen navigation or app backgrounding.

#### FR-16: Analytics data fetching
When Marc opens the Analytics screen or changes a filter, the app constructs a filter parameter payload (time span, category, subcategory, context) and sends it to the Analytics Query Agent (n8n endpoint). The agent returns structured, pre-aggregated data for the graph and the raw entry list. The app renders from the agent's response; it does not perform SQL, aggregation, or calculation client-side.

**[NOTE FOR PM]** The Analytics Query Agent response schema (aggregation shape, field names, data types) is an Architect deliverable — it does not exist today and must be designed before the Analytics screen can be implemented or tested. The Architect must define the API contract (request params + response envelope) as part of the architecture phase.

**Consequences (testable):**
- App sends filter parameters to the Analytics Query Agent on screen open and on filter change.
- Graph data is derived from the agent's aggregated response per the defined API contract, not client-side calculation.
- Entry list is derived from the agent's raw entry list response per the defined API contract.
- A loading state is shown while the request is in flight.
- An error state is shown if the request fails, with a retry option.

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
When a Context is Active, the Confirmation Card's Context Drum Roller defaults to the Active Context. Marc can change it to another Context, clear it (no context), or leave it as the Active Context. The Active Context is an offer, not a forced assignment.

**Consequences (testable):**
- Confirmation Card Context Drum Roller defaults to the Active Context when one is active.
- Marc can change or clear the context on any individual Entry.
- No context is forced; the Drum Roller is always editable.

#### FR-19: Inline Context creation during logging
When Marc types a new context name during natural language entry (e.g. "120€ hotel Mallorca viaje nuevo"), Conchita detects the context signal and either creates a new Context or suggests it. [ASSUMPTION: Conchita's LLM prompt will be enriched to detect context signals in natural language and proactively suggest new contexts; this is a backend change.] The Confirmation Card shows the suggested new Context in the Drum Roller for Marc to confirm or discard.

**Consequences (testable):**
- If Conchita detects a new context signal, the Confirmation Card pre-populates the Context Drum Roller with the suggested new name.
- Marc can confirm (creates and assigns the Context), change the name, or clear it.
- A confirmed new Context is created in the DB and available in all pickers immediately.
- If Conchita detects no context signal, the Context Drum Roller defaults to the Active Context (if one exists) or empty — identical behaviour to any other entry. No special state or prompt is shown.

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

#### FR-24: PDF preview access
On invoice entries — in the Review Card, the Home list, and the Analytics list — Marc can access the associated PDF. The trigger is a swipe action (swipe direction and exact UX pattern is a UX decision). The PDF opens in a native viewer within the app. The PDF is fetched from Google Drive via its stored link.

**Consequences (testable):**
- Invoice entries expose a PDF access action; non-invoice entries do not.
- Triggering the action opens the PDF in a native in-app viewer.
- PDF is correctly fetched from its Google Drive URL.

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
- **No voice entry (V1).** Planned for V1.1. The FAB radial fan includes a placeholder that shows a "coming soon" state.
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

- Widget (iOS WidgetKit + Android App Widget) with text entry, mini confirmation, and error state
- In-app FAB: text entry, photo/PDF entry (radial fan), voice placeholder (non-functional)
- Conchita Round-trip (request-response, no streaming)
- Offline entry queuing (Telegram-style, ~5 entry depth)
- Confirmation Card with Drum Roller quick-edit
- Push notification confirmation with deep-link to Confirmation Card
- Full Edit Screen (all fields)
- Entry deletion with confirmation dialog
- Home screen: expense list, Home Screen Window, monthly grouping + subtotals, grand total, post-log cascade animation, swipe-to-reveal (Edit, Delete, PDF for invoices)
- Analytics screen: unified filter bar, quick pills, swipeable graph (donut/pie/bar), filterable entry list, local-only entry deselect
- Analytics data via Analytics Query Agent (new n8n workflow)
- Context Tagging: Active Context indicator, per-entry opt-in, inline creation during logging, Settings management
- Gmail Invoice Flow: Unknown Sender notifications (always-on), Known Sender notifications (configurable), Invoice Review Card, PDF access, inline sender registration, Senders management in Settings
- Settings: n8n connection config, notification toggles, Home Screen Window, theme (dark/light), Senders management, Context management
- Push notification delivery infrastructure (new)
- Conchita LLM prompt enrichment for context signal detection (new backend change)
- TypeScript strict mode, Husky pre-commit hooks (lint + type check)
- Unit, component, and E2E test suite (meaningful critical-path coverage)
- GitHub Actions CI/CD: PR gate (lint + types + tests), merge-to-main build + local artifact storage
- Repo documentation: n8n workflow export + self-hosting setup guide

### 6.2 Out of Scope for MVP

- Voice entry → **V1.1**
- Partner / multi-user access → **V1.1**
- AI-generated spending insights
- Reminder / nudge notifications
- Budget goals, bank sync, import, export
- Retroactive bulk Context assignment
- App Store / Play Store submission (personal use; build artifact distributed via GitHub Actions)
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
3. **Swipe direction for PDF access** — Right swipe, additional left-swipe depth, or long-press? Deferred to UX Designer, considering platform conventions for both iOS and Android.
4. **Analytics graph additional types** — UX Designer may propose one additional graph type beyond donut/pie/bar if it provides distinct descriptive value. Deferred to UX Designer.
5. **Confirmation Card density threshold** — Amount, category, subcategory, description, context are required. Currency and date are added "if it fits without crowding." UX Designer defines the threshold and decides which fields make the cut on smaller screen sizes.
6. **Context picker placement** — Fast access from Home screen: sheet, modal, popover, or inline expand? Deferred to UX Designer.
7. ~~**"All notifications off" and Unknown Sender**~~ — **Resolved.** Unknown Sender notifications are always-on by design and cannot be disabled by any Settings toggle. FR-28 and FR-21 are consistent. No open question.
8. **n8n connection fields** — The exact fields required for the self-hosting connection configuration (base URL, API key, webhook secret, etc.) are an architecture decision. Architect to define and document.
9. **Retroactive bulk Context assignment** — Not in V1. Revisit for V1.1 if partner use case reveals it as a pain point.
10. **App license** — Marc wants to allow forks for learning but prevent commercial use of the source code. License selection (e.g. CC BY-NC, BSL, or custom) is a pre-publish task outside the app build scope. Tracked in the addendum.

---

## 9. Assumptions Index

- **§1** — Conchita's character is defined as a sharp, competent 90s accountant with dry irony (Pepper Potts archetype). No tone guide or copy library exists yet; the UX Designer will define this from scratch using this description.
- **§4.1 / FR-1** — Widget platform constraints (WidgetKit / Android App Widget) may limit live text updates during the loading state. Architect to confirm feasibility before the UX Designer specifies the loading copy behaviour.
- **§4.1 / FR-4** — Offline queue depth is ~5 entries maximum. Marc rarely logs more than a couple of entries offline in sequence.
- **§4.2 / FR-5** — The list source of truth is always Conchita's confirmed response. The app never optimistically renders Marc's raw typed input in the Home list.
- **§4.4 / FR-14** — UX designer may propose one additional graph type beyond donut/pie/bar if it provides distinct descriptive value. The final graph type list is a UX decision.
- **§4.4 / FR-16** — The Analytics Query Agent (new n8n workflow) will be built as part of this project. It does not exist today.
- **§4.5 / FR-19** — Conchita's LLM prompt will be enriched to detect context signals in natural language. This is a required backend change, not optional.
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
- Merge-to-main: build artifact generated and stored as a GitHub Actions artifact for local download. No TestFlight or store submission.

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
