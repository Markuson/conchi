---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-conchi-2026-08-20/prd.md
  - _bmad-output/planning-artifacts/prds/prd-conchi-2026-08-20/addendum.md
  - _bmad-output/planning-artifacts/architecture/architecture-conchi-2026-08-23/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-conchi-2026-08-22/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-conchi-2026-08-22/EXPERIENCE.md
---

# Conchi - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Conchi, decomposing the requirements from the PRD, UX Design, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR-1: Widget text entry and submission — Marc can type a natural language expense description into the Widget and submit without opening the app. Widget sends to n8n endpoint; shows loading indicator with Conchita voice copy during processing; shows mini confirmation (amount + category) on success; shows error state with Conchita voice copy, original input preserved, and retry button on failure. Widget is text-only (no media capture — confirmed platform constraint).

FR-2: In-app text entry via FAB — Marc can tap the center FAB on the Home screen to open a text input. Submitting triggers the Conchita Round-trip with two-phase loading (Phase 1: HTTP POST in-flight; Phase 2: n8n processing until FCM push). Cycling Conchita voice copy during Phase 2; Confirmation Card appears on success; error state with preserved input and retry on failure.

FR-3: In-app media entry via FAB radial fan — Long-press FAB reveals radial fan with exactly three options: Escriure (write/text), Càmera (photo/camera or gallery), PDF. No voice option present in V1. Selecting Càmera opens native camera or gallery picker; selecting PDF opens native file picker. File forwarded to Conchita n8n endpoint. Confirmation Card on success; error with retry on failure.

FR-4: Offline entry queuing — Entries submitted without connectivity stored locally (max depth ~5). On connectivity restored, queued entries sent in submission order, one at a time. Normal Confirmation Card / push notification fires for each queued entry as processed. Queue cleared after successful processing.

FR-5: In-app Confirmation Card display — After successful Round-trip while app is in foreground, Confirmation Card slides up from bottom showing: amount (editable), category (Drum Roller — all values from categories table), subcategory (Drum Roller — filtered by category), description (editable), context (Drum Roller — all non-archived contexts, only shown if contexts exist), date, currency. Dismissing (Acceptar) saves entry as displayed; editing Drum Rollers before dismissal saves modified values. Descartar discards entry without saving.

FR-6: Push notification confirmation (background) — When Conchita completes Round-trip while app is backgrounded or closed, push notification fires containing confirmed entry summary (amount, category). Tapping notification opens app and navigates directly to Confirmation Card for that entry. Entry saved in DB regardless of whether notification is tapped.

FR-7: Full Edit Screen — All Entry fields editable: amount (numeric input), currency (Drum Roller), category (Drum Roller), subcategory (Drum Roller, dependent on category), description (text input), context (Drum Roller — select existing or create new via "+ Nou context" option), date (native date picker), attachment (view/replace/remove). Saving persists changes via n8n endpoint and updates Home list. Cancel discards without mutation.

FR-8: Entry deletion with confirmation — Delete available from Full Edit Screen or swipe-to-reveal on Home/Analytics list. Always requires explicit confirmation dialog before removal. Deletion not available from Confirmation Card or Invoice Review Card.

FR-9: Expense list with Home Screen Window — Home screen displays Entries within selected Home Screen Window: last calendar week (Mon–Sun), last calendar month, last 7 days, last 30 days, last N expenses (N user-defined positive integer). Entries grouped by calendar month with month header and subtotal. Grand total for full visible window shown at top. Entries sorted newest-first within each month group.

FR-10: List item anatomy — Each list item renders as a single-line card in resting state. Data shown: amount (dominant visual weight), category (secondary), subcategory (tertiary, uppercase), short date. Context badge (🏷) shown if entry has a Context assigned; absent otherwise. Attachment indicator (📎) shown if file exists. Tap → accordion expand to reveal description, context, attachment "Obrir" link.

FR-11: Post-log list update and animation — Foreground case: single confirmed entry slides to top of list on Confirmation Card dismissal. Background case: all entries confirmed while backgrounded cascade into list bottom-to-top (oldest→newest) with Reanimated stagger on next app open, once per app open. Stagger interval matches UX spec value. List source of truth is always Conchita's confirmed response; no optimistic rendering of raw input.

FR-12: Swipe-to-reveal actions on list items — Both left and right swipe on any list item reveal identical action panel: Veure (Show — only if attachment exists), Editar (Edit — all entries), Eliminar (Delete — all entries). Editar navigates to Full Edit Screen; Eliminar triggers inline confirmation (row replaces content with "Segur? [Eliminar]" on danger background; tap outside cancels, tap Eliminar removes row); Veure opens file in in-app viewer.

FR-13: Unified filter bar (Analytics) — Analytics screen has horizontal scrollable filter chip row: Periode (time span — Mes actual / Últims 30 dies / Últims 7 dies / Setmana actual, single-select via drum picker), Categoria (all categories), Subcategoria (subcategories of selected Categoria, dependent), Context (all defined contexts, hidden if no contexts exist). Active chips shown in amber. All filters apply simultaneously to both graph and list.

FR-14: Swipeable graph (Analytics) — Chart area displays expense data for active filters. Two chart types in V1: Gràfic de sectors (donut/pie, proportional spend by category with legend) and Gràfic de barres (horizontal bar chart, total spend per category). Marc swipes left/right to switch chart types. Page-dot indicator below chart shows current type. User's last selection persists. Chart area occupies ~40% of screen height.

FR-15: Filterable expense list (Analytics) — Below chart, scrollable list of Entries matching active filters. Same single-line card anatomy as Home list (accordion expand for description). Manual deselect per entry (checkbox or similar) excludes entry from graph calculation for current session only. Deselection state resets on screen navigation or app backgrounding.

FR-16: Analytics data fetching — App sends structured JSON filter payload (from, to, category, subcategory, context) to Analytics Endpoint on screen open and every filter change. Receives pre-aggregated totals array and raw entry list. App renders from response without client-side aggregation. App never connects to PostgreSQL directly. Loading state shown during request; error state with retry on failure.

FR-17: Active Context indicator and picker — Persistent indicator visible on Home screen whenever a Context is active (no indicator when none active). Tapping indicator opens fast context picker (sheet/modal/popover). Picker allows: deactivate current context, switch to another, create new context. Switching deactivates previous context. Only one context can be active at a time.

FR-18: Per-entry Context opt-in — When a Context is Active, Confirmation Card's Context Drum Roller defaults to Active Context. Marc can change to another context, clear it (no context), or leave as Active Context. Always editable; no forced assignment. No option to create new Context from the Confirmation Card.

FR-19: Context creation surfaces — Contexts can always be created from Settings (Context Manager screen). Also from Full Edit Screen via "+ Nou context" option in Context Drum Roller (resolved OQ-14). New Context saved immediately to DB and available across all pickers. No Context creation from Confirmation Card.

FR-20: Context management in Settings — Settings → CONTEXTOS → "Gestió de contextos >" navigates to Context Manager screen. Marc can: create (+ Afegir context button → name input → save), edit (✏️ inline or push to name-edit), archive, unarchive, delete (🗑 → inline "Segur?" confirmation). Archived contexts hidden from all pickers but historical entry data retained. Deleting context with associated entries requires confirmation; removes context reference from those entries.

FR-21: Unknown Sender push notification (always-on) — When Conchita receives Gmail invoice from Unknown Sender, push notification always sent with available invoice summary (amount, sender name if parseable). This notification cannot be disabled by any Settings toggle.

FR-22: Known Sender push notification (configurable) — When Conchita processes Gmail invoice from Known Sender, push notification sent by default. Marc can disable Known Sender notifications via toggle in Settings. Disabling does not suppress Unknown Sender notifications (FR-21 always-on).

FR-23: Invoice Review Card via deep link — Tapping any invoice push notification navigates to Invoice Review Card. Structurally identical to regular Confirmation Card (FR-5): amount, category Drum Roller, subcategory Drum Roller, description, context Drum Roller, date/currency. Additional PDF access action available. All Drum Roller editing functional. No delete action on Review Card (deletion via Full Edit Screen or swipe-to-reveal only).

FR-24: File preview access (PDF and images) — Entries with associated file expose Veure/Show action (swipe-to-reveal panel in Home and Analytics lists; Obrir link in accordion expand; UX-defined trigger in Review Card). File opens in native in-app viewer. Gmail invoice PDFs and app-uploaded files (photo receipts, PDFs via FAB) are both fetched directly from their Google Drive URL — same pipeline.

FR-25: Inline Unknown Sender registration — Invoice Review Card for Unknown Sender invoice includes "Add sender" quick action. Triggering adds sender to `remitents_factura` in DB. Future invoices from that sender classified as Known Sender.

FR-26: Known Senders management in Settings — Settings provides Senders management area: view list, add new sender (name + email pattern), edit existing sender, delete sender. Changes persist immediately and affect future invoice processing.

FR-27: n8n connection configuration — Settings → CONNEXIÓ has exactly two fields: webhook base URL (n8n instance base URL, all endpoint paths derived from it) and auth secret (Bearer token, rendered as password field). No SSE endpoint field. Saving triggers connection validation (test ping). Successful validation confirms and stores configuration. Failed validation shows descriptive error and does not save. App uses stored configuration for all subsequent n8n requests.

FR-28: Notification toggles — Settings → NOTIFICACIONS: (1) "All notifications off" toggle — suppresses all push notifications except Unknown Sender; (2) "Known Sender off" toggle — suppresses only Known Sender invoice notifications. Unknown Sender notifications (FR-21) not suppressible by any setting.

FR-29: Home Screen Window configuration — Settings → VISUALITZACIÓ → Periode per defecte: all five options (Mes actual, Últims 30 dies, Últims 7 dies, Setmana actual, Últimes N despeses with custom count N as positive integer). Selecting any option updates Home screen list immediately. Selection and configured N persist across sessions.

FR-30: Theme selection — Settings → VISUALITZACIÓ → Tema: Clar / Fosc / Sistema. Theme change applies immediately across entire app without restart. Theme selection persists across sessions.

### NonFunctional Requirements

NFR-1: TypeScript strict mode — Strict mode across entire codebase. No `any`. Full type coverage. Enforced by Husky pre-commit hook; lint + type check must pass before every commit.

NFR-2: Code quality — ESLint enforced at pre-commit. Base ruleset: @typescript-eslint/recommended-type-checked + eslint-plugin-react-native + eslint-plugin-react-hooks. Specific rule overrides defined in project-skeleton story. Compatible with strict TypeScript.

NFR-3: Dependencies — Minimal by default; add library only if genuinely necessary and no reasonable platform-native alternative. Approved: Zustand 5.x (state management), React Native Reanimated 3.x (animations), React Native Gesture Handler 2.x. All others require justification. pnpm is sole package manager.

NFR-4: Performance — App cold-start: < 2 seconds on mid-range device. Round-trip entry-to-confirmation: < 5 seconds on good mobile connection. List / Analytics data load: < 1 second from cache; loading state shown for any request > 300ms.

NFR-5: Testing — Unit tests: business logic, utility functions, data transformations. Component tests: key UI components (Confirmation Card, Drum Roller, list items, filter bar). E2E tests (Detox 20.x): golden-path journeys UJ-1 through UJ-7 on Android emulator. Detox configured at project skeleton before first feature story.

NFR-6: CI/CD — Three GitHub Actions workflows: pr-gate.yml (lint + type check + unit + component + Detox E2E on Android emulator, must pass before merge); deploy-app.yml (Android APK → Firebase App Distribution, invite-only, Marc's email only); deploy-docs.yml (Docusaurus + Storybook → GitHub Pages on merge to main). No iOS build in CI. No store submission.

NFR-7: Security — Webhook secret stored in expo-secure-store (device secure enclave), never in MMKV, never committed. Every n8n request carries Authorization: Bearer <secret>. GitHub Actions Secrets hold all server-side credentials (Firebase service account, Android signing keystore, FCM server key). .env files gitignored. No real VPS URLs or tokens in any committed documentation asset; all docs use placeholder values.

NFR-8: Public repo + private distribution — Source code repository public (portfolio visibility). APK builds never attached to GitHub Releases (would be openly downloadable). Firebase App Distribution invite-only; only Marc's registered email can install the app.

NFR-9: Repo documentation — n8n workflow export (JSON) committed to repo. Self-hosting setup guide covers: n8n instance setup, Conchita configuration, DB schema, app Settings connection fields. Written for technically capable audience. Deployed to GitHub Pages via Docusaurus.

NFR-10: Multi-user-ready architecture — V1 serves one user (Marc) but must not create structural barriers to adding a second user in V1.1. No hardcoded user identity. userId: string is a required field in every Entry data shape, enforced by TypeScript compiler. FCM token registration endpoint designed for per-user tokens.

NFR-11: Platform — Bare React Native 0.76+, no Expo managed workflow, no EAS Build. Expo SDK packages used as libraries only. iOS 16+ (WidgetKit AppIntents for widget text submission). Android API 26+ (App Widget). Minimum OS versions driven by widget API requirements.

NFR-12: Language and copy — Default UI language: Català. English switchable from Settings. Spanish never used anywhere in the app or copy. Conchi voice copy (loading states, empty states, error messages, confirmation language) must feel like Conchita — sharp, dry, competent, slightly ironic. Never generic or motivational.

### Additional Requirements

- **Project skeleton first** (AD-1): Project is bare React Native — no Expo managed workflow. Project skeleton story must be delivered and committed before any feature story begins. Skeleton includes: project init, pnpm setup, ESLint + Husky, TypeScript strict config, React Navigation setup with ROUTES constant, Zustand store structure, Detox configuration, GitHub Actions workflows, Docusaurus + Storybook scaffold.
- **Feature-sliced + atomic architecture enforced** (AD-2): components/ never imports from features/ or store/. Screens contain no business logic. Feature hooks co-located in feature folders. Zustand slices inside feature folders; store/index.ts aggregates only. Violation is a CI failure (ESLint import rules).
- **FCM as unified async channel** (AD-3): n8n sends a single FCM combined message (notification + data payload) for every async event. data.type discriminates: round_trip_result | invoice_unknown | invoice_known. On startup, app POSTs FCM device token to n8n registration endpoint (n8n upserts to device_tokens table). lib/fcm/ exposes typed event emitter only; app shell registers per-type callbacks on mount and routes payloads to features.
- **Parameterised analytics SQL** (AD-4): Analytics n8n workflow is exactly 3 nodes: Webhook → Postgres → Respond. No AI-generated SQL, no Execute Code node, no client-side SQL. Filter payload: { from, to, category, subcategory, context }. Response envelope: { totals: { label, value }[], entries: Entry[] }.
- **MMKV offline queue contract** (AD-7): Queue item shape: { id: string; type: 'text' | 'image' | 'pdf'; payload: string; timestamp: number }. Max depth: 5. Drain trigger: @react-native-community/netinfo isConnected event → true. Serial drain (one item at a time). Owned by features/entry/offlineQueue.ts.
- **Animations disabled in Detox builds** (AD-8): Environment flag disables all Reanimated animations in Detox test builds to prevent test flakiness.
- **Widget shared container** (AD-12): iOS: App Group configured for main app target and WidgetKit extension. Android: widget reads from SharedPreferences written by main app. Both hold webhook URL and auth secret.
- **Storybook co-located stories** (AD-14): .stories.tsx files co-located with components inside components/. Storybook web build deployed alongside Docusaurus to GitHub Pages.
- **Reference data slice** (AD-16): categories, subcategories, and contexts live in store/referenceData.ts. features/settings is sole writer (fetches on first launch and on user-triggered refresh). All other features read from this slice.
- **Single VPS Docker Compose** (AD-17): n8n + PostgreSQL on same host (MinIO deployed from Story 1.2, later removed — see AD-6). No dev/staging environment — development devices connect to live n8n instance. App version displayed in Settings → SOBRE → Versió (semver, bumped manually before Firebase release).
- **New backend deliverables required**: (1) device_tokens table in PostgreSQL for FCM token storage; (2) Analytics Endpoint n8n workflow (3-node: Webhook → Postgres → Respond); (3) FCM dispatch integration in existing n8n entry-processing flow; (4) FCM token registration endpoint in n8n; (5) new origen value 'app' in transaccions table.

### UX Design Requirements

UX-DR1: Implement complete semantic color token system — 14 tokens per mode (dark: bg #18140f, surface #201a13, surface-alt #261e15, text-primary #fdfaf4, text-secondary #b09870, text-tertiary #7a6a50, accent #c8922a, accent-muted rgba(200,146,42,0.18), accent-underline rgba(200,146,42,0.55), rule rgba(253,250,244,0.07), border rgba(253,250,244,0.11), danger #8b2020, danger-bg rgba(139,32,32,0.22), nav-bg #18140f; light mode equivalents per DESIGN.md). All components reference semantic tokens only — never raw hex values.

UX-DR2: Implement three-font typography system — Special Elite (hero: home total 32px, month total 13px accent, confirmation card amount 28px), Courier Prime (all data: row amount 15px 700, row category 13px, row subcategory/date 10px uppercase, drum picker selected 13px 700 uppercase, drum picker ghost 10px 28% opacity, field values 12px, Conchi quote italic 12px), System UI (shell: section header 10px 600 uppercase, field label 9px 600 uppercase, nav label 10px 500, button text 11px 700 uppercase, filter chip 11px 500). Load Google Fonts: Special Elite and Courier Prime.

UX-DR3: Implement 4px-base spacing system — xs=4px, sm=8px, md=12px, lg=16px, xl=24px, 2xl=32px. Apply xl (24px) horizontal padding consistently on all screens.

UX-DR4: Implement bottom navigation bar with notched/cradle Bézier cutout at top-center. FAB elevated above bar surface, partially inside notch. Left tab: Inici (house icon + "Inici"); right tab: Estadístiques (bar chart icon + "Estadístiques"). Bar: 64px height + safe area, nav-bg background, 1px rule top edge. Active state: accent; inactive: text-tertiary. Min tap target: 44×44px.

UX-DR5: Implement FAB as 56px amber circle. On tap: radial fan of three 44px mini-buttons arc upward — left arm: ✏️ Escriure, center: 📷 Càmera, right: 📄 PDF. Labels in System UI 9px above each button. Semi-transparent backdrop on fan open; tap-outside or tap-FAB-again closes without action. FAB shows spinner (no text submit) during Phase 1 (Enviant).

UX-DR6: Implement Conchi Bubble — 48px persistent circle, absolute top-right on every screen. Three image states: conchi-idle.png (default), conchi-working.png (Phase 2 processing, until FCM response), conchi-error.png (error, auto-reverts to Idle after 10s). 200ms crossfade between states. Tap opens Configuració regardless of state. Apply pixel art recolor mapping: dark outlines/jacket/hair → #2c1a0a, amber bow/accents → #c8922a, collar/cuffs → #fdfaf4, book cover → #4a2e12, error glitch pixels kept as-is.

UX-DR7: Implement two-phase loading states — Phase 1 (Enviant, HTTP POST in-flight): FAB shows spinner, submission blocked, duration typically <1s; on POST failure: error toast + Conchi bubble → Error state. Phase 2 (Processant, awaiting FCM push): FAB returns to normal, Conchi bubble → Working state, app fully browsable, optional persistent top banner "La Conchita ho està mirant..."; on FCM error or timeout: Conchi bubble → Error state, error message "Alguna cosa ha anat malament. Torna-ho a provar.", error reverts to Idle after 10s.

UX-DR8: Implement Expense Row component — collapsed single-line: category left (Courier Prime 13px text-primary), subcategory below-left (Courier Prime 10px text-tertiary uppercase), amount right (Courier Prime 15px 700 text-primary), date below-right (Courier Prime 10px text-tertiary), indicators 📎🏷 (amber 10px, only when present). Padding: 13px vertical × 24px horizontal. Bottom edge: 1px rule. Tap → accordion expand: dashed separator line, Descripció and Context rows (System UI 9px label + Courier Prime 12px value), attachment row (📎 filename + Obrir link in accent). Swipe left/right (symmetric): Veure (accent bg, only if attachment), Editar (surface bg, text-secondary), Eliminar (danger bg, white). Delete inline confirmation: row bg → danger-bg, content → "Segur? [Eliminar]".

UX-DR9: Implement Month Section Header — "AGOST 2026 ─────────── €224.60" pattern: left text System UI 10px text-secondary uppercase 0.14em, hairline 1px rule fill, right Special Elite 13px accent. 8px vertical × 24px horizontal padding. Background same as bg (no contrast from rows).

UX-DR10: Implement Drum Roller picker component (iOS time-picker style) for all closed-field edits: Category, Subcategory, Currency, Context. Three visible items: ghost above (Courier Prime 10px 28% opacity), selected (Courier Prime 13px 700 uppercase), ghost below (Courier Prime 10px 28% opacity). Track: top + bottom 1px rule. Letter spacing: 0.08em. Used consistently in Confirmation Card, Full Edit Screen, and Analytics filter chips.

UX-DR11: Implement Confirmation Card as bottom sheet — 20px top border-radius, surface-alt background, confirmation card shadow. Anatomy top-to-bottom: (1) drag handle 36×4px pill text-tertiary 14% opacity; (2) amount Special Elite 28px text-primary editable numeric, accent-underline 2px bar below; (3) side-by-side Categoria + Subcategoria drum pickers with hairline column separator; (4) Data field with date picker; (5) Descripció editable text; (6) Context drum picker (only if contexts exist, "—" if none selected); (7) Attachment row 📎 filename + Obrir link (only if file present); (8) Conchi quote Courier Prime italic 12px text-secondary; (9) button row 24px horizontal padding 10px gap: Descartar (secondary button) + Acceptar (primary button).

UX-DR12: Implement Analytics filter chip row — horizontal scrollable, 24px edge padding, 8px gap. Four filter chips: Periode, Categoria, Subcategoria (dependent on Categoria), Context (hidden if no contexts). Chip: 30px height, 12px horizontal padding, 20px border-radius pill, System UI 11px 500. Inactive: surface bg, 1px border, text-secondary. Active: accent-muted bg, 1px accent border, accent text. Tapping chip opens drum/list picker.

UX-DR13: Implement Analytics chart area with two swipeable chart types — Gràfic de sectors (donut/pie, proportional spend by category, with legend) and Gràfic de barres (horizontal bar chart, total spend per category). Swipe left/right between types. Page-dot indicator below chart. ~40% of screen height. Last chart type selection persists across sessions.

UX-DR14: Implement Configuració screen with four grouped sections using System UI 10px uppercase section headers (0.14em spacing): CONNEXIÓ (URL del webhook text field, auth secret password field — exactly two fields per AD-15, no SSE endpoint field), VISUALITZACIÓ (Periode per defecte picker, Idioma picker: Català/English, Tema picker: Clar/Fosc/Sistema), CONTEXTOS ("Gestió de contextos ›" navigation row), SOBRE (Versió display-only).

UX-DR15: Implement Gestió de Contextos screen — list of all contexts with ✏️ edit and 🗑 delete actions per row. Delete shows inline "Segur?" confirmation. "+ Afegir context" button at bottom navigates to name-input screen; save creates context and returns to list. Empty state: "Encara no tens cap context." with + Afegir context button. Also implement "+ Nou context" option in Context Drum Roller on Full Edit Screen (context creation from Full Edit surface, per resolved OQ-14).

UX-DR16: Implement Catalan as default language throughout. English switchable from Settings → VISUALITZACIÓ → Idioma. Spanish never used anywhere. All Conchi voice copy strings (loading states, empty states, confirmation copy, error messages) must embody the Conchita character: sharp, competent, dry, mildly ironic — examples: "Registrat. Com sempre.", "Tot en ordre." Never generic or cheerful.

UX-DR17: Implement all empty states — Home list: larger Conchi idle image + "Encara no hi ha despeses." + "Afegeix-ne una amb el botó +."; Analytics: "Cap resultat per als filtres actius." + [Modificar filtres] button; Context Manager: "Encara no tens cap context." + [+ Afegir context] button.

UX-DR18: Implement button component in three variants — Primary/Acceptar (accent bg, bg text color, 44px height, 4px radius, System UI 11px 700 uppercase 0.10em); Secondary/Descartar (transparent bg, 1px border, text-secondary, 44px height, 4px radius); Danger/Eliminar (danger bg, white text, 44px height, 4px radius).

UX-DR19: Implement hero total underline — 32×2px rect, accent-underline color, border-radius 1px, displayed below home screen header total. Implement hairline 1px rule dividers between every expense row and as section separators. Implement 1px dashed rule separator between collapsed and expanded accordion content.

UX-DR20: Implement post-log cascade animation (background case) using React Native Reanimated — confirmed entries that arrived while app was backgrounded cascade into list bottom-to-top (oldest→newest) with defined stagger on next app open, triggering once per app-open event for the batch. Foreground case: single entry slides to top of list on Acceptar (Confirmation Card dismiss). All animations use Reanimated; disabled via environment flag in Detox test builds.

### FR Coverage Map

| FR | Epic | Summary |
|---|---|---|
| FR-1 | Epic 7 | Widget text entry, mini confirmation, error state |
| FR-2 | Epic 2 | In-app text entry via FAB, two-phase loading |
| FR-3 | Epic 2 | Media entry (photo/PDF) via FAB radial fan, Google Drive upload |
| FR-4 | Epic 2 | Offline entry queue (MMKV, max 5, drain on reconnect) |
| FR-5 | Epic 2 | Confirmation Card with Drum Rollers (Context field stubbed) |
| FR-6 | Epic 2 | Push notification + deep-link to Confirmation Card |
| FR-7 | Epic 3 | Full Edit Screen (all fields, date picker; Context field stubbed) |
| FR-8 | Epic 3 | Entry deletion with confirmation dialog |
| FR-9 | Epic 2 | Home Screen expense list with window options — basic browsable list after entry |
| FR-10 | Epic 2 | Single-line list item anatomy (accordion expand) |
| FR-11 | Epic 3 | Post-log cascade animation (foreground + background case) |
| FR-12 | Epic 3 | Swipe-to-reveal (Veure / Editar / Eliminar), inline delete confirmation |
| FR-13 | Epic 4 | Unified filter bar (4 filter chips) |
| FR-14 | Epic 4 | Swipeable chart area (donut/pie + bar) |
| FR-15 | Epic 4 | Filterable expense list with session-only deselect |
| FR-16 | Epic 4 | Analytics data fetching from n8n endpoint |
| FR-17 | Epic 5 | Active Context indicator + fast picker on Home Screen |
| FR-18 | Epic 5 | Per-entry Context opt-in — activates stubbed Confirmation Card field |
| FR-19 | Epic 5 | Context creation surfaces (Settings + Full Edit Screen) |
| FR-20 | Epic 5 | Context management screen in Settings |
| FR-21 | Epic 6 | Unknown Sender push notification (always-on) |
| FR-22 | Epic 6 | Known Sender push notification (configurable) |
| FR-23 | Epic 6 | Invoice Review Card via deep link |
| FR-24 | Epics 3/4/6 | File preview — introduced in Epic 3 (Home list), extended in Epics 4 and 6 |
| FR-25 | Epic 6 | Inline Unknown Sender registration from Review Card |
| FR-26 | Epic 6 | Known Senders management in Settings |
| FR-27 | Epic 1 | n8n connection config (webhook URL + auth secret) — foundational |
| FR-28 | Epic 2 | Notification toggles — added to Settings when push notifications are first built |
| FR-29 | Epic 3 | Home Screen Window config — added to Settings when Home Screen is built |
| FR-30 | Epic 1 | Theme selection (dark/light/system) — part of design system from day one |

## Epic List

### Epic 1: App Foundation & Connection Setup
Marc has a production-ready app skeleton deployed to Firebase App Distribution — with working CI/CD, the complete design system, app shell navigation, Conchi Bubble, and a Settings screen covering the two features meaningful from day one: n8n connection configuration and theme selection. Epic 1 ends with a tracer bullet: Marc types an expense in the FAB and sees a raw Conchita response — the causal chain working end-to-end before quality layers are added.

**FRs covered:** FR-27, FR-30

> **Design note (pre-mortem change):** Only FR-27 and FR-30 live here. FR-28 (notification toggles) and FR-29 (Home Screen Window config) are deferred to the epics where those features are first built — they are meaningless without notifications or the Home Screen existing.
>
> **Infrastructure prerequisite (second-order change, revised 2026-08-27, superseded 2026-08-28):** Epic 1 originally included a self-hosting infrastructure story — ensuring n8n + PostgreSQL + MinIO are running under Docker Compose and accessible from the development device. Story 1.2 delivered and validated this, but MinIO was never wired into the app (see AD-6, revised) and its `self-hosting/` compose/docs were removed 2026-08-28 as unused. Epic 2's media entry story has no infra gate: it depends only on the existing n8n Drive connection, already proven by the invoice flow.
>
> **Tracer bullet story (steelman S1 change):** The final story of Epic 1 is an end-to-end tracer bullet — a minimal, unstyled proof that the causal chain works: FAB tap → plain text input → POST to n8n → raw Conchita response displayed in a placeholder view. No Drum Rollers, no Confirmation Card, no design tokens applied yet. The purpose is psychological: Marc sees the core loop working before spending time on the quality layer. Epic 2 replaces the placeholder with the production Confirmation Card and full FCM infrastructure.
>
> **Analytics API contract types (portfolio lens):** An existing Epic 1 story — likely the project skeleton story — must commit the Analytics TypeScript types to `lib/types`: `AnalyticsFilterParams`, `AnalyticsResponse`, and `AnalyticsTotals`. These are pure TypeScript, no backend work required. Committing the full API contract upfront demonstrates intentional backend design from day one and is visible to a hiring manager reading the repo before the Analytics screen exists.

---

### Epic 2: Core Expense Entry, Confirmation & Basic Home List
Marc can log expenses by text, photo, or PDF from within the app, receive Conchita's categorized confirmation on a Confirmation Card, see all confirmed entries in a basic but browsable Home Screen list (grouped by month, single-line anatomy with accordion expand), and get push notifications when the app is backgrounded. At the end of this epic the app is a usable daily-driver tool. Settings gains the notification toggles section.

**FRs covered:** FR-2, FR-3, FR-4, FR-5, FR-6, FR-9, FR-10, FR-28

> **Design notes (pre-mortem + assumption audit + second-order changes):**
> - **FCM spike gate (A1 mitigation):** Story 1 of this epic is an FCM proof-of-concept spike. Its AC must include: "an FCM test message is successfully delivered to a real Android device from the self-hosted n8n instance." Production FCM infrastructure code only proceeds after this is confirmed. If FCM is not viable, transport strategy must be revisited before any other Epic 2 story begins.
> - **Drive upload + read validation gate (A6 + second-order mitigation, revised 2026-08-27):** The media entry story (FR-3) must validate the FAB-triggered upload path end-to-end before building UI on top of it. AC must include: "a 5MB test image sent through the n8n webhook is uploaded via n8n's existing Drive node and the returned Drive URL resolves the file without additional app-side authentication." Validates payload size limits and that the Drive node handles an app-sourced trigger correctly, not just the Gmail-sourced one.
> - FCM infrastructure defines the full message type contract from the start: `round_trip_result` | `invoice_unknown` | `invoice_known` and the full dispatch bridge (AD-3) — prevents surgery in Epic 6.
> - Context Drum Roller on Confirmation Card is hidden when contexts array is empty (correct UX spec behavior, not a stub) — this is the production behavior for a user with no contexts; activates naturally in Epic 5 when contexts first exist.
> - FR-9 + FR-10 (basic Home Screen list + list item anatomy) added here so Marc has a browsable entry list after Epic 2 — dogfooding value between epics. FR-11 (cascade animation), FR-12 (swipe-to-reveal), FR-7 (Full Edit), FR-8 (deletion) remain in Epic 3.
> - FR-28 (notification toggles) ships here because push notifications are first built here.
> - **Reference data story (developer lens):** A dedicated "Reference Data" story must appear early in Epic 2 — before the Confirmation Card story. AC: "categories and subcategories are fetched from n8n on first launch, cached in MMKV, exposed via `store/referenceData.ts`, and available to Drum Rollers across the app without additional fetching." This is the most cross-cutting state in the app (used in Epics 2, 3, 4, 5); building it as a named story ensures its contract (AD-16: `features/settings/` is sole writer, all features read) is tested from the outset.
> - **Storybook AC on component stories (portfolio lens):** Every story in this epic that creates a new component must include in its AC: "a Storybook story exists for this component covering its primary states." This applies at minimum to: Drum Roller, Confirmation Card, ConchiBubble, ExpenseRow, FAB, and MonthSectionHeader. AC lines are added to existing stories — no new stories required.

---

### Epic 3: Home Screen Polish & Full Entry Management
Marc's Home Screen gains its full feature set — cascade animation (foreground and background cases), swipe-to-reveal actions (Veure / Editar / Eliminar), and the Home Screen Window period selector. He can fully edit any entry via the Full Edit Screen and delete entries. File preview is available via the swipe Veure action. Settings gains the Home Screen Window configuration.

**FRs covered:** FR-7, FR-8, FR-11, FR-12, FR-24 (Home list), FR-29

> **Design notes (pre-mortem + second-order changes):**
> - FR-9 + FR-10 moved to Epic 2 — Home Screen list already exists; this epic enhances it with animation, swipe actions, and window filtering.
> - Full Edit Screen includes Context Drum Roller and "+ Nou context" option — hidden when contexts array is empty (same correct UX spec behavior as Confirmation Card); activates naturally in Epic 5.
> - FR-29 (Home Screen Window config) ships here because window filtering (the full FR-9 feature) is completed here.
> - FR-24 file preview is introduced here (Home list swipe Veure action and accordion "Obrir" link).
> - **Storybook AC on component stories (portfolio lens):** Every story in this epic that creates a new component must include in its AC: "a Storybook story exists for this component covering its primary states." Applies at minimum to: FullEditScreen, swipe-reveal action panel, and cascade animation states.

---

### Epic 4: Analytics
Marc can analyze his spending with period, category, subcategory, and context filter chips, interactive swipeable charts (donut/pie and bar), and a filterable expense list with per-entry deselect — giving the journal data a meaningful couch-browsing experience.

**FRs covered:** FR-13, FR-14, FR-15, FR-16, FR-24 (Analytics list)

> **Backend-first sequencing (A12 mitigation):** Story 4.1 is the Analytics n8n workflow — build and validate the backend before any UI story begins. The n8n workflow is 3 nodes: Webhook → Postgres → Respond (AD-4). Story 4.1 AC must include: "filter params sent from a test client return the correct totals array and entries array against real data." All subsequent Epic 4 stories explicitly depend on Story 4.1 being complete and the API contract validated. This prevents UI stories from piling up as "done but untestable."

---

### Epic 5: Context Tagging
Marc can define trip and event contexts, activate one as the session default, have it offered per entry (activating the stubbed fields on Confirmation Card and Full Edit Screen built in Epics 2 and 3), manage contexts from a new Settings section, and see historical spending by context in Analytics.

**FRs covered:** FR-17, FR-18, FR-19, FR-20

> **Design note (pre-mortem change):** This epic activates the Context Drum Roller and "+ Nou context" option already present (stubbed) in the Confirmation Card (Epic 2) and Full Edit Screen (Epic 3). No screen rewrites required — fields are wired, not added.

---

### Epic 6: Gmail Invoice Flow
Marc receives timely notifications when invoices arrive by email, can deep-link directly to review and confirm each invoice (with PDF access via the in-app viewer), register unknown senders in one tap, and manage his sender list from a new Settings section.

**FRs covered:** FR-21, FR-22, FR-23, FR-24 (Invoice Review Card), FR-25, FR-26

> **Design note:** The FCM `invoice_unknown` and `invoice_known` message types were defined and wired in Epic 2's FCM infrastructure story — the dispatch bridge here only adds feature-level handlers, not infrastructure changes.

---

### Epic 7: Widget
Marc can log expenses from his phone's home screen without opening the app — the zero-friction capture point that anchors the daily logging habit.

**FRs covered:** FR-1

> Per PRD: widget is explicitly the last V1 deliverable. All in-app FRs must be fully functional before widget implementation begins.
>
> **Native target spike (developer lens):** Story 7.1 is a feasibility spike for the native widget extension target — not widget UI. AC: "iOS WidgetKit extension target is added to the Xcode project with App Group configured; Android App Widget target is added with SharedPreferences write from main app confirmed readable by widget process; no existing CI or build pipeline broken." This validates AD-12 and the native build configuration before writing a line of widget UI. Epic 7 involves a context switch to Swift (iOS) and Kotlin/Java (Android) after 6 epics of TypeScript — the spike surfaces any native toolchain issues before they block widget UI work.

---

## Epic 1: App Foundation & Connection Setup

Marc has a production-ready app skeleton deployed to Firebase App Distribution — with working CI/CD, the complete design system, app shell navigation, Conchi Bubble, and a Settings screen covering the two features meaningful from day one: n8n connection configuration and theme selection. Epic 1 ends with a tracer bullet: Marc types an expense in the FAB and sees a raw Conchita response — the causal chain working end-to-end before quality layers are added.

### Story 1.1: Project Skeleton & CI/CD

As Marc the developer,
I want a bare React Native project with pnpm, TypeScript strict mode, ESLint + Husky, React Navigation, Zustand, Detox, and three GitHub Actions workflows configured,
So that every subsequent story is built on a quality foundation that enforces correctness from the first commit and ships to Firebase App Distribution automatically on merge.

**Acceptance Criteria:**

**Given** an empty repository
**When** `pnpm install` is run
**Then** all dependencies install cleanly with no lockfile conflicts
**And** no npm or yarn commands are used in any script file, Makefile, or GitHub Actions workflow step; documentation examples are out of scope for this AC

**Given** a TypeScript file containing an `any` type
**When** the Husky pre-commit hook runs
**Then** the type check step fails and the commit is blocked

**Given** any code change staged for commit
**When** the pre-commit hook fires
**Then** lint + type check both run; the commit is blocked if either fails

**Given** a pull request is opened
**When** `pr-gate.yml` runs on GitHub Actions
**Then** lint + type check + unit tests all pass before merge is permitted

**Given** a merge to main
**When** `deploy-app.yml` runs
**Then** an Android APK is built and distributed to Marc's Firebase App Distribution invite-only group (Marc's email only); the APK is never attached to a GitHub Release

**Given** a merge to main
**When** `deploy-docs.yml` runs
**Then** the Docusaurus and Storybook web builds deploy to GitHub Pages without error

**Given** the navigation module
**When** any screen or feature references a route
**Then** it imports from the typed `ROUTES` constant in `navigation/`; no string literals are used as route names

**Given** the Zustand store
**When** `store/index.ts` is imported
**Then** it only aggregates and re-exports feature slices — it contains no business logic, no state, and no selectors of its own

**Given** `deploy-app.yml`
**When** it runs
**Then** all secrets (signing keystore, Firebase service account, FCM server key) are sourced exclusively from GitHub Secrets — none are present in committed files

---

### Story 1.2: Self-Hosting Infrastructure

*Status: **REJECTED** (2026-08-28). MinIO was built and verified exactly as specified in the AC below, then Marc decided against using it — app-uploaded files use Google Drive instead (see AD-6, revised) and the `self-hosting/` MinIO compose/docs were removed from the repo. Tracked as `done` in sprint-status.yaml (the work was completed and reviewed as planned) but is not part of the shipped product — treat MinIO as never having been adopted. AC below is kept only as an accurate historical record of what was built.*

As Marc the self-hoster,
I want n8n, PostgreSQL, and MinIO running under Docker Compose and accessible from my development device — with MinIO public-read validated,
So that the backend infrastructure required for all subsequent development is in place before any story depends on it.

**Acceptance Criteria:**

**Given** the Docker Compose configuration
**When** `docker compose up` is run
**Then** n8n, PostgreSQL, and MinIO all start and reach a healthy state with no errors

**Given** the running stack
**When** the development device makes an HTTP request to the n8n webhook base URL
**Then** a response is received, confirming network reachability from the device

**Given** the running MinIO instance
**When** a test file is uploaded via the S3 API using the n8n S3 node's endpoint and credentials
**Then** the upload succeeds and a URL is returned

**Given** the returned MinIO URL
**When** a `fetch()` call is made from the app (or a mobile browser request) without any `Authorization` header
**Then** the file content resolves correctly, confirming public read access is configured

**Given** the self-hosting guide
**When** the infrastructure section is read
**Then** Docker Compose setup, MinIO bucket public-read policy, and n8n S3 node credential configuration are documented using placeholder values only — Marc's real server address, credentials, and tokens are never present in any committed file

---

### Story 1.3: Design System Foundation

As Marc the developer,
I want the complete color token system, typography system, spacing system, Button component, Storybook scaffold, and Analytics API contract types implemented,
So that all subsequent components compose a coherent visual identity and the full Analytics API contract is documented from day one.

**Acceptance Criteria:**

**Given** any component in the codebase
**When** it references a color
**Then** it uses a semantic token (e.g. `tokens.accent`, `tokens.bg`) never a raw hex value; all 14 dark-mode and 14 light-mode tokens from DESIGN.md are defined

**Given** the typography system
**When** Special Elite is applied
**Then** it appears only on hero-role text: home screen total, month section total, and Confirmation Card amount — nowhere else
**And** Courier Prime is used for all data surfaces; System UI for all shell surfaces (nav labels, buttons, section headers, field labels)

**Given** the spacing system
**When** any component applies padding, margin, or gap
**Then** it references one of the 6 spacing tokens (xs=4, sm=8, md=12, lg=16, xl=24, 2xl=32px); all screens apply 24px horizontal edge padding

**Given** the Button component
**When** rendered in Primary variant
**Then** it matches the spec: `accent` background, `bg` text, 44px height, 4px radius, System UI 11px 700 uppercase 0.10em letter spacing
**And** Secondary variant: transparent background, 1px `border`, `text-secondary`, 44px height
**And** Danger variant: `danger` background, white text, 44px height

**Given** the Storybook scaffold
**When** `pnpm storybook` is run
**Then** Storybook launches and the Button component story is visible showing all three variants (Primary, Secondary, Danger) in both dark and light mode

**Given** `lib/types/analytics.ts`
**When** imported
**Then** it exports `AnalyticsFilterParams` (`{ from: string; to: string; category?: string; subcategory?: string; context?: string }`), `AnalyticsTotals` (`Array<{ label: string; value: number }>`), and `AnalyticsResponse` (`{ totals: AnalyticsTotals; entries: Entry[] }`)

**Given** `lib/types/entry.ts`
**When** the `Entry` type is used anywhere in the codebase
**Then** `userId: string` is a required field — the TypeScript compiler enforces this at every callsite with no exceptions

---

### Story 1.4: App Shell & Navigation

As Marc the user,
I want a working app shell with the notched bottom navigation bar, a Conchi Bubble, and placeholder screens for all three main surfaces,
So that I can navigate between Home, Analytics, and Settings and the visual shell is in place for all subsequent feature development.

**Acceptance Criteria:**

**Given** the app is open on any screen
**When** the bottom navigation bar renders
**Then** it displays the notched/cradle Bézier cutout at top-center with the FAB floating above in the notch, Inici tab (house icon + "Inici") on the left, and Estadístiques tab (bar chart icon + "Estadístiques") on the right

**Given** a tab is active
**When** the bottom nav renders
**Then** the active tab icon and label appear in `accent` color; the inactive tab icon and label appear in `text-tertiary`; each tap target is at minimum 44×44px

**Given** the device has a notch or dynamic island
**When** the bottom nav renders
**Then** the bar height adjusts to include safe area padding below the nav surface; content is never obscured

**Given** the app is open on any screen
**When** the Conchi Bubble renders
**Then** it appears as a 48px circle fixed to the top-right corner, displaying `conchi-idle.png` with the pixel art recolor applied (dark outlines → #2c1a0a, amber accents → #c8922a, collar → #fdfaf4, book cover → #4a2e12)

**Given** the Conchi Bubble
**When** tapped from any screen
**Then** navigation goes to the Settings screen

**Given** the app launches
**When** the root navigator initializes
**Then** HomeScreen is the default screen; navigating to AnalyticsScreen and SettingsScreen shows their placeholders without crashing; all routes are typed via `ROUTES`

---

### Story 1.5: Settings Screen (CONNEXIÓ + TEMA + SOBRE)

As Marc the user and self-hoster,
I want to configure my n8n connection credentials and display theme from the Settings screen,
So that the app connects to my Conchita backend with the correct authentication and displays in my preferred visual mode.

**Acceptance Criteria:**

**Given** the Settings screen is opened via Conchi Bubble tap
**When** rendered
**Then** three sections appear with System UI 10px uppercase section headers (0.14em letter spacing): CONNEXIÓ, VISUALITZACIÓ (Tema subsection only at this stage), and SOBRE

**Given** the CONNEXIÓ section
**When** rendered
**Then** exactly two fields are shown: "URL del webhook" (plain text input) and auth secret (password field — characters masked); no "Endpoint SSE" or any other field is present

**Given** a webhook URL is entered
**When** the validate action is triggered
**Then** the URL is validated for format (scheme must be `http://` or `https://`) before any network call is made; an invalid format shows "URL no vàlida" inline without sending a request

**Given** a valid webhook URL and auth secret are entered and the validate action triggered
**When** the validation request fires
**Then** the app sends an HTTP request to the configured n8n webhook URL with `Authorization: Bearer <secret>` header

**Given** the validation request returns HTTP 200
**When** the success response is received
**Then** the webhook URL is saved to MMKV and the auth secret is saved to `expo-secure-store`; a success confirmation is shown to the user

**Given** `expo-secure-store` fails to write the auth secret (e.g. device encryption unavailable)
**When** the write error occurs
**Then** an error message is shown; the configuration is not reported as saved; the fields remain editable

**Given** the validation request fails or times out
**When** the error is received
**Then** a descriptive error message is shown; no configuration is saved; the fields remain editable

**Given** the auth secret at any point in the app lifecycle
**When** any persistence operation occurs
**Then** the auth secret is stored exclusively in `expo-secure-store` — never in MMKV, `.env` files, `AsyncStorage`, or any committed asset

**Given** the VISUALITZACIÓ → Tema picker
**When** Marc selects Fosc, Clar, or Sistema
**Then** the theme switches immediately across the entire app without requiring a restart

**Given** a theme is selected and the app is closed and reopened
**When** the app initializes
**Then** the previously selected theme is applied before the first frame renders

**Given** the SOBRE section
**When** rendered
**Then** the app version string from `package.json` is displayed as read-only; it matches the semver value in the package

**Given** all Settings copy
**When** rendered in the default language
**Then** all labels are in Catalan (CONNEXIÓ, URL del webhook, Acceptar, Descartar, Tema, Clar, Fosc, Sistema, Versió, SOBRE)

**Given** the Idioma (language toggle) defined in the UX spec under VISUALITZACIÓ
**When** this story is complete
**Then** the Idioma toggle is not present — language switching is deferred to V1.1; the app displays Catalan exclusively in V1 with no language switch in Settings

---

### Story 1.6: Tracer Bullet — End-to-End Causal Chain

As Marc the user,
I want to type an expense in a minimal unstyled FAB input and see the raw Conchita response displayed,
So that I have proof the core causal chain (FAB tap → n8n → Conchita → response) works end-to-end before any quality layers are built on top of it in Epic 2.

**Acceptance Criteria:**

**Given** the Home screen with a valid n8n connection configured
**When** the FAB is tapped
**Then** a minimal plain text input appears — no Drum Rollers, no Conchi bubble animation, no design token styling beyond basic system UI

**Given** the text input is empty or contains only whitespace
**When** the submit action is triggered
**Then** the submission is rejected; a basic inline message indicates input is required; no POST request is sent

**Given** text is entered and submitted
**When** the POST request fires
**Then** it is sent to the configured n8n webhook URL with `Authorization: Bearer <secret>` header; the raw request body contains the entered text

**Given** the POST is in flight
**When** the request is pending
**Then** a basic system loading indicator is shown (activity spinner or plain text — no styled animation)

**Given** Conchita processes the entry and a response arrives
**When** the response is received
**Then** it is displayed in a plain unstyled placeholder view (raw JSON or basic text); no Confirmation Card, Drum Rollers, or styled UI is present

**Given** the n8n endpoint returns an error or is unreachable
**When** the failure is detected
**Then** a plain error message is shown and the original typed text is preserved

**Given** Settings has not been configured (no webhook URL or auth secret)
**When** the FAB is tapped
**Then** the user is redirected to Settings with a plain prompt to configure the connection before logging

**Given** Epic 2 ships and replaces this flow
**When** the codebase is reviewed
**Then** no tracer bullet placeholder code remains — the FAB tap, loading state, and response display are entirely replaced by the production Confirmation Card and FCM infrastructure

---

## Epic 2: Core Expense Entry, Confirmation & Basic Home List

Marc can log expenses by text, photo, or PDF from within the app, receive Conchita's categorized confirmation on a Confirmation Card, see all confirmed entries in a basic but browsable Home Screen list (grouped by month, single-line anatomy with accordion expand), and get push notifications when the app is backgrounded. At the end of this epic the app is a usable daily-driver tool. Settings gains the notification toggles section.

### Story 2.1: FCM Spike — Push Delivery Validation

As Marc the developer,
I want proof that FCM push messages can be delivered from the self-hosted n8n instance to a real Android device,
So that all subsequent Epic 2 stories are built on a validated transport layer and not blocked mid-epic by a platform integration failure.

**Acceptance Criteria:**

**Given** the self-hosted n8n instance is running
**When** a test FCM workflow is triggered manually (e.g. via n8n's test execution)
**Then** an FCM push message is successfully delivered and visible on a real Android device registered to Marc's Firebase App Distribution group

**Given** the delivered FCM message
**When** its payload is inspected on the receiving device
**Then** it contains a `data` object with a `type` field — confirming the data payload pattern required by AD-3 (`round_trip_result` | `invoice_unknown` | `invoice_known`)

**Given** the spike is complete
**When** results are documented
**Then** the n8n FCM node configuration (credential type, payload shape, device registration token approach) is captured in a developer note; all values use placeholders — no real FCM server keys or device tokens are committed

**Given** the spike validates FCM delivery
**When** the app has a valid FCM registration token
**Then** the spike also validates the token registration flow: the app sends the FCM device token to the n8n registration endpoint with `Authorization: Bearer <secret>`; n8n stores the token and can use it to address subsequent FCM pushes to this device

**Given** this spike fails (FCM delivery not confirmed on a real device)
**When** the failure is identified
**Then** no further Epic 2 stories begin until the transport strategy is revisited and a viable alternative is confirmed

---

### Story 2.2: Reference Data — Categories & Subcategories

As Marc the user,
I want categories and subcategories to be fetched from Conchita and available across the app without repeated network calls,
So that Drum Rollers throughout the app always show current data without rebuilding the fetch logic in every screen.

**Acceptance Criteria:**

**Given** the app launches for the first time with a valid n8n connection configured
**When** initialization completes
**Then** categories and their subcategories are fetched from the n8n endpoint and stored in MMKV

**Given** categories are cached in MMKV
**When** `store/referenceData.ts` is imported by any feature slice
**Then** it exposes categories, subcategories, and contexts as readable state; `features/settings/` is the sole writer of this slice (AD-16 contract)

**Given** the app launches on a subsequent session
**When** MMKV already contains reference data
**Then** the data is loaded from cache without a network request; a background refresh may occur but is not required for rendering

**Given** the n8n endpoint is unreachable on first launch
**When** the fetch fails
**Then** a retry is scheduled; the app continues to launch (no crash, no blank screen); Drum Rollers in this session show an empty state with an appropriate message

**Given** `store/referenceData.ts`
**When** any feature reads from it
**Then** it reads via selector — no feature writes to this slice directly; TypeScript enforces this at compile time

---

### Story 2.3: Confirmation Card

As Marc the user,
I want a Confirmation Card that displays Conchita's extracted entry data with all editable fields,
So that I can review, correct, and accept or discard each logged expense before it is saved.

**Acceptance Criteria:**

**Given** the Confirmation Card is triggered (initially via mock data in this story)
**When** it appears
**Then** it slides up from the bottom of the screen with a Reanimated spring animation; a semi-transparent backdrop covers the content behind it

**Given** the card is visible
**When** rendered
**Then** it shows: amount (Special Elite font, amber, editable via numeric keyboard tap), category Drum Roller (pre-selected), subcategory Drum Roller (dependent on category, pre-selected), description (editable inline), date (editable), currency Drum Roller, Conchi quote (short italic personality line, not editable), Descartar button (Danger variant), Acceptar button (Primary variant)
**And** the Conchi quote is selected at random from the hardcoded constant array in `lib/conchiCopy.ts` under the `roundTripSuccess` key; the array contains at minimum 5 distinct strings; content is placeholder copy at this stage — final strings are deferred to a content/copywriting phase

**Given** contexts exist in `store/referenceData.ts`
**When** the card renders
**Then** a context Drum Roller is shown with all non-archived contexts as options; "—" is the default (no context selected)

**Given** contexts array is empty in `store/referenceData.ts`
**When** the card renders
**Then** no context field or Drum Roller is shown — this is the production behavior, not a stub

**Given** a Drum Roller field (category, subcategory, currency, context)
**When** tapped
**Then** an iOS time-picker style drum roller opens with the correct options; selecting a value updates the field and closes the picker

**Given** the subcategory Drum Roller
**When** the category selection changes
**Then** the subcategory options update to show only subcategories belonging to the newly selected category; the previous subcategory selection is cleared

**Given** Conchita's response contains a `category` value not found in `store/referenceData.ts`
**When** the card renders
**Then** the category Drum Roller defaults to the first available category in `store/referenceData.ts`; the Drum Roller label renders in `text-tertiary` color and an ⚠️ icon appears inline beside the field label to signal the mismatch; the subcategory Drum Roller resets accordingly

**Given** Conchita's response contains a null or negative amount
**When** the card renders
**Then** the amount field displays `0.00`; Marc can edit it before accepting; negative values are not accepted as-is

**Given** the category Drum Roller has no selection (empty reference data or cleared selection)
**When** the Acceptar button is rendered
**Then** the Acceptar button is disabled; an inline message indicates a category is required; Marc must select a category before the card can be accepted

**Given** the Acceptar button
**When** tapped with a valid category selected
**Then** the card dismisses (slides down) and the entry data as displayed (including any edits) is passed to the save handler

**Given** an "Editar" tertiary link on the Confirmation Card
**When** tapped
**Then** the card dismisses without saving and navigation goes to the Full Edit Screen pre-populated with Conchita's extracted data; Marc can make detailed edits and save from there

**Given** the Descartar button
**When** tapped
**Then** the card dismisses and no data is persisted; the entry is discarded

**Given** a Storybook story for the Confirmation Card
**When** `pnpm storybook` is run
**Then** the story is visible showing at minimum: card with context field visible (contexts present), card with context field hidden (contexts empty), and card with pre-filled mock data

---

### Story 2.4: Text Entry — Full Round-Trip Flow

As Marc the user,
I want to type an expense description, submit it, and see Conchita's confirmation on the Confirmation Card,
So that I can log expenses by text and have them saved correctly in one fluid interaction.

**Acceptance Criteria:**

**Given** the Home screen with a valid n8n connection configured
**When** the FAB is tapped
**Then** the Escriure text input overlay appears (styled with design tokens; this replaces the tracer bullet placeholder from Story 1.6)

**Given** the Escriure text input contains only empty or whitespace text
**When** the submit action is triggered
**Then** the submission is rejected; an inline validation message appears; no POST request is sent

**Given** text is entered and submitted (Phase 1 begins)
**When** the POST request is in flight
**Then** the FAB shows an inline spinner; a second submission attempt is blocked; the Conchi Bubble remains in Idle state

**Given** Phase 1 completes (HTTP 200 received from n8n)
**When** the success response is received
**Then** the FAB spinner stops and returns to normal; the Conchi Bubble transitions to Working state (crossfade ~200ms to `conchi-working.png`); Phase 2 begins

**Given** Phase 2 is active (app awaiting FCM push)
**When** the user navigates to Estadístiques or scrolls the Home list
**Then** the app remains fully interactive; Phase 2 continues in the background; the Conchi Bubble stays in Working state across all screens

**Given** the FCM `round_trip_result` push arrives while the app is in the foreground
**When** the message is received
**Then** the Conchi Bubble transitions back to Idle state; the Confirmation Card (from Story 2.3) slides up with Conchita's extracted data pre-filled

**Given** the user taps Acceptar on the Confirmation Card
**When** the accept action fires
**Then** the entry data is sent to the n8n save endpoint with `Authorization: Bearer <secret>`; on success the card dismisses

**Given** Phase 1 fails (network error or non-200 response)
**When** the failure is detected
**Then** the FAB spinner stops; the Conchi Bubble transitions to Error state (`conchi-error.png`); auto-reverts to Idle after 10 seconds; error message shown with original typed text preserved and a retry option

**Given** Phase 2 times out or FCM returns an error
**When** the timeout or error is detected
**Then** the Conchi Bubble transitions to Error state; error message: *"Alguna cosa ha anat malament. Torna-ho a provar."*; auto-reverts to Idle after 10 seconds
**And** the Phase 2 timeout duration is defined as a named constant `PHASE2_TIMEOUT_MS` (default value: 60 000 ms); it is not a magic number inline in the handler

**Given** the FCM SDK fires a token-refresh event (`onTokenRefresh`)
**When** the app receives the new token
**Then** it immediately re-registers the new token with n8n via the same registration endpoint used in Story 2.1; the old token is replaced; no user action is required

**Given** this story is marked complete
**When** the save endpoint is reviewed
**Then** the n8n save workflow has been manually tested with a test client using the intended payload shape; the canonical save contract fields (`amount`, `category`, `subcategory`, `description`, `date`, `currency`, `userId`, `context`, `attachmentUrl`) are documented in `docs/api-contracts.md` under a "Save Entry Endpoint" section committed to the repository — this ensures the endpoint shape is validated before Full Edit (3.1) and Invoice (6.1) build on top of it

---

### Story 2.5: Basic Home List

As Marc the user,
I want my confirmed expenses displayed in a browsable list grouped by month,
So that I can see what I've logged and verify entries are being saved correctly.

**Acceptance Criteria:**

**Given** confirmed entries exist in Conchita's backend
**When** the Home screen opens
**Then** entries are fetched from n8n, sorted by the entry's `date` field newest-first, and grouped under month section headers by that same `date` field (e.g. "AGOST 2026 ─────── €224.60" with month subtotal in Special Elite amber); a backdated entry appears under its backdated month section, not at the top of the list

**Given** the Home screen header
**When** rendered
**Then** it shows the grand total for the visible window in Special Elite font and the period sublabel (e.g. "agost 2026" for Mes actual); no app name is shown in the header

**Given** a list entry in resting state
**When** rendered
**Then** it shows: category (primary, Courier Prime), subcategory (secondary, uppercase, muted), amount (primary bold), short date (secondary muted); attachment indicator (📎) shown only if file exists; context badge (🏷) shown only if context assigned

**Given** a list entry
**When** tapped
**Then** it accordion-expands to reveal: description, context value (if assigned), attachment "Obrir" link (if file exists); tapping again collapses it

**Given** the "Obrir" link in the accordion
**When** tapped
**Then** the file opens in the in-app viewer (image viewer for images, PDF viewer for PDFs)

**Given** no entries exist
**When** the Home screen renders
**Then** the empty state is shown: larger Conchi idle render, "Encara no hi ha despeses.", "Afegeix-ne una amb el botó +."

**Given** Marc accepts a Confirmation Card
**When** the card dismisses
**Then** the Home list performs a silent background refresh and the new entry appears at the top of the list without animation (the slide-in animation is added in Story 3.4)

**Given** the Home list
**When** this story is complete
**Then** no swipe-to-reveal actions, no cascade animations, and no window-period filtering are implemented — those ship in Epic 3

---

### Story 2.6: Media Entry (Camera + PDF)

As Marc the user,
I want to log expenses by photographing a receipt or attaching a PDF from the FAB,
So that I can capture paper receipts and email invoices without manual transcription.

**Acceptance Criteria:**

**Given** the FAB is tapped
**When** the radial fan opens
**Then** three mini-buttons arc upward: Escriure (pencil icon, "Escriure"), Càmera (camera icon, "Càmera"), PDF (document icon, "PDF"); a semi-transparent backdrop covers content; tapping outside or tapping FAB again closes the fan without action

**Given** Marc taps Càmera in the radial fan
**When** the action fires
**Then** the native camera opens (or the system photo library picker on devices without camera); the fan closes

**Given** a photo is captured or selected
**When** the image is confirmed
**Then** it is sent as a multipart POST to the n8n webhook URL with `Authorization: Bearer <secret>`; Phase 1 + Phase 2 loading follows the same pattern as Story 2.4

**Given** Marc taps PDF in the radial fan
**When** the action fires
**Then** the native file picker opens filtered to PDF files only; the fan closes

**Given** a PDF is selected
**When** confirmed
**Then** it is sent to the n8n webhook URL; Phase 1 + Phase 2 loading follows the same pattern as Story 2.4

**Given** a selected image or PDF exceeds 10 MB
**When** the file size is checked (before upload)
**Then** the submission is rejected immediately with "El fitxer és massa gran"; no upload is attempted; the radial fan closes

**Given** camera or photo library permission is denied by the OS
**When** the denial is detected
**Then** an explanatory message is shown ("Cal permís per accedir a la càmera / fotos"); a button links directly to the device's app Settings so Marc can grant permission; no crash occurs

**Given** Marc opens the camera, photo library, or file picker and cancels without selecting
**When** the picker returns no file
**Then** the radial fan closes gracefully; no error is shown; no submission is attempted

**Given** the media upload flow (Drive validation AC)
**When** a 5 MB test image is sent through the n8n webhook
**Then** the upload succeeds via n8n's existing Drive node; the returned Drive URL resolves the file in a `fetch()` call from the app without any `Authorization` header — confirming payload size support and that the Drive node handles app-sourced uploads correctly

**Given** Conchita's FCM response arrives after a media entry
**When** the `round_trip_result` is received
**Then** the Confirmation Card shows the extracted data with the attachment filename displayed (not replaceable from this card)

**Given** a Storybook story for the FAB component
**When** `pnpm storybook` is run
**Then** the story shows: FAB in resting state, FAB with radial fan open (all three mini-buttons visible)

---

### Story 2.7: Background Push & Notification Settings

As Marc the user,
I want to receive a push notification when Conchita finishes processing while the app is backgrounded, and to control which notifications I receive from Settings,
So that I never miss a confirmation and can tune notification behavior to my preference.

**Acceptance Criteria:**

**Given** an entry is submitted and the FCM `round_trip_result` arrives while the app is backgrounded or closed
**When** the push notification fires
**Then** it displays the confirmed amount and category in the notification body

**Given** Marc taps the push notification
**When** the app opens or foregrounds
**Then** it navigates directly to the Confirmation Card for that specific entry; the entry is pre-filled with Conchita's extracted data

**Given** the entry behind the notification
**When** it is saved in the database by n8n
**Then** it is persisted regardless of whether Marc taps the notification — tapping only opens the review UI, not the save action

**Given** the Settings screen
**When** the NOTIFICACIONS section is rendered (FR-28)
**Then** it contains at minimum a toggle for round-trip result notifications; toggle state is saved to MMKV; disabling suppresses the FCM-triggered system notification

**Given** notification permissions have not been granted
**When** the app first attempts to register for FCM
**Then** the system permission dialog is shown; if denied, a plain informational message explains that notifications require permission; no crash occurs

---

### Story 2.8: Offline Queue

As Marc the user,
I want entries I log without connectivity to be queued and automatically submitted when I'm back online,
So that I never lose an expense just because I'm in a location without signal.

**Acceptance Criteria:**

**Given** an entry is submitted (text, camera, or PDF) with no network connectivity
**When** the submission attempt fails due to no connectivity
**Then** the entry is stored in the MMKV offline queue with shape `{ id: string; type: 'text' | 'image' | 'pdf'; payload: string; timestamp: number }`; a plain confirmation message informs Marc the entry is queued
**And** for `image` and `pdf` types, the file is copied to the app's persistent cache directory (not the OS temp directory) before enqueuing; `payload` stores the path to this persistent copy, ensuring the file survives OS temp-file purges until it is successfully uploaded

**Given** the queue already contains 5 entries
**When** Marc attempts to log a 6th entry without connectivity
**Then** the submission is rejected with a message indicating the queue is full; the existing 5 entries are not affected

**Given** connectivity is restored
**When** the app detects network availability
**Then** queued entries are submitted to n8n one at a time, in submission order (oldest first)

**Given** a queued entry is submitted successfully
**When** the FCM `round_trip_result` arrives
**Then** the normal Confirmation Card flow triggers for foreground; push notification triggers for background; the entry is removed from the queue

**Given** a queued entry submission fails on retry
**When** the failure is detected
**Then** the entry remains in the queue for the next connectivity window; subsequent queued entries are not blocked by a single failure

**Given** all queued entries have been processed
**When** the queue drains
**Then** the queue in MMKV is empty; no stale entries remain

**Given** one or more entries are in the offline queue
**When** the Home screen renders
**Then** a plain pending indicator is visible (e.g. badge or subtle banner: "X entrades pendents d'enviar") so Marc knows queued entries exist and that clearing app data would lose them; the indicator disappears when the queue is empty

---

## Epic 3: Home Screen Polish & Full Entry Management

Marc's Home Screen gains its full feature set — cascade animation (foreground and background cases), swipe-to-reveal actions (Veure / Editar / Eliminar), and the Home Screen Window period selector. He can fully edit any entry via the Full Edit Screen and delete entries. File preview is available via the swipe Veure action. Settings gains the Home Screen Window configuration.

### Story 3.1: Full Edit Screen

As Marc the user,
I want to open any expense entry and edit all its fields,
So that I can correct mistakes or add details that Conchita missed after the fact.

**Acceptance Criteria:**

**Given** an entry exists in the Home list
**When** the Full Edit Screen opens (via swipe → Editar from Story 3.3, or via the "Editar" link on the Confirmation Card from Story 2.3)
**Then** all fields are pre-populated with the entry's current values: amount (numeric input), currency (Drum Roller), category (Drum Roller), subcategory (Drum Roller, dependent on category), description (text input), date (native date picker), context (Drum Roller — hidden if no contexts exist), attachment (filename shown if present)

**Given** a Drum Roller field on the Full Edit Screen
**When** tapped
**Then** the iOS time-picker style drum roller opens with the correct options from `store/referenceData.ts`; selecting a value updates the field

**Given** contexts exist in `store/referenceData.ts`
**When** the context Drum Roller is opened
**Then** it lists all non-archived contexts plus a "+ Nou context" option at the end; selecting "+ Nou context" opens a simple name-input screen; saving creates the context, adds it to `store/referenceData.ts`, and returns to Full Edit with it selected

**Given** contexts array is empty in `store/referenceData.ts`
**When** the Full Edit Screen renders
**Then** no context field or Drum Roller is shown — same production behavior as the Confirmation Card

**Given** the attachment section
**When** a file is attached to the entry
**Then** the filename is shown with an "Obrir" link (opens in-app viewer), a "Substituir" option (opens picker to replace), and an "Eliminar adjunt" option (removes attachment from entry)

**Given** the Save action
**When** Marc taps Save
**Then** the updated entry is sent to the n8n update endpoint with `Authorization: Bearer <secret>`; on success the screen closes and the Home list reflects the updated values

**Given** Marc has edited one or more fields and taps Cancel or the back gesture
**When** the navigation-away action fires
**Then** a confirmation sheet appears: "Tens canvis sense desar. Descartar els canvis?" with a Danger "Descartar" button and a "Continuar editant" option; tapping Descartar exits without saving; tapping Continuar editant returns to the form

**Given** Marc has not edited any field and taps Cancel or the back gesture
**When** the navigation-away action fires
**Then** the screen closes immediately with no confirmation sheet

**Given** a Storybook story for the Full Edit Screen
**When** `pnpm storybook` is run
**Then** the story is visible showing: screen with all fields populated, context field visible, context field hidden (empty contexts)

---

### Story 3.2: Entry Deletion

As Marc the user,
I want to delete an expense entry with an explicit confirmation step,
So that I can remove mistakes without risking accidental data loss.

**Acceptance Criteria:**

**Given** the Full Edit Screen is open
**When** Marc taps the Delete action
**Then** a confirmation dialog appears: "Segur que vols eliminar aquesta despesa?" with a Danger "Eliminar" button and a cancel option

**Given** the confirmation dialog
**When** Marc taps Eliminar
**Then** a DELETE request is sent to the n8n endpoint with `Authorization: Bearer <secret>`; on success the Full Edit Screen closes and the entry is removed from the Home list

**Given** the confirmation dialog
**When** Marc taps outside the dialog or taps the cancel option
**Then** the dialog dismisses with no change; the entry is not deleted

**Given** a swipe-to-reveal Eliminar action on a Home list row (wired in Story 3.3)
**When** Marc taps Eliminar in the swipe panel
**Then** the row content is replaced inline with "Segur?" on a `danger-bg` background and an "Eliminar" button; tapping outside cancels and restores the row; tapping Eliminar sends the DELETE request and animates the row out

**Given** the DELETE request fails
**When** the error is received
**Then** a descriptive error message is shown; the entry is not removed from the list; Marc can retry

---

### Story 3.3: Swipe-to-Reveal Actions

As Marc the user,
I want to swipe left or right on any Home list entry to reveal quick actions,
So that I can view the attachment, open Full Edit, or delete an entry without tapping into it first.

**Acceptance Criteria:**

**Given** a Home list entry
**When** swiped left or right (either direction, symmetric)
**Then** the swipe panel slides in revealing: Veure (amber, eye icon — only shown if entry has an attachment), Editar (neutral, pencil icon — always shown), Eliminar (danger, trash icon — always shown)

**Given** the Veure action
**When** tapped
**Then** the entry's attached file opens in the in-app viewer (image viewer or PDF viewer)

**Given** the Editar action
**When** tapped
**Then** navigation goes to the Full Edit Screen (Story 3.1) pre-populated with the entry's data; the swipe panel closes

**Given** the Eliminar action
**When** tapped
**Then** the inline delete confirmation from Story 3.2 triggers: row content replaced with "Segur? [Eliminar]" on `danger-bg`; tap outside cancels; tap Eliminar removes the row

**Given** a swipe panel is open on one row
**When** the user taps anywhere outside the panel
**Then** the panel closes and the row returns to its resting state with no action taken

**Given** a swipe panel is open on one row
**When** the user swipes to open a panel on a different row
**Then** the first panel closes automatically before the second opens; only one swipe panel is open at a time

**Given** Reanimated and Gesture Handler are used for the swipe gesture
**When** the app is built with the Detox test flag active
**Then** animations are disabled via the environment flag (AD-8) so swipe actions are still reachable in E2E tests

**Given** a Storybook story for the swipe-reveal panel
**When** `pnpm storybook` is run
**Then** the story shows: row with panel revealed showing all three actions (with Veure visible), and row with panel revealed showing only Editar + Eliminar (no attachment)

---

### Story 3.4: Post-Log List Animation

As Marc the user,
I want newly confirmed entries to animate into the Home list,
So that the transition from logging to seeing the entry feels immediate and satisfying.

**Acceptance Criteria:**

**Given** Marc accepts a Confirmation Card while the app is in the foreground
**When** the card dismisses
**Then** the confirmed entry slides into the top of the Home list (or into the correct month group if it's not the current month) with a Reanimated slide-in animation; the month subtotal and grand total update immediately

**Given** Marc submitted entries while the app was backgrounded (entries confirmed by FCM while app was closed)
**When** the app is next opened
**Then** all entries confirmed since last open cascade into the Home list bottom-to-top (oldest first, newest last) with a Reanimated stagger animation — this cascade plays once per app open session, not on every navigation back to Home

**Given** the cascade animation plays
**When** it begins
**Then** each entry animates in with a sequential delay of 80 ms between entries; if DESIGN.md specifies a different stagger value, that value takes precedence and this AC must be updated before implementation begins

**Given** Reanimated is used for all animations in this story
**When** the app is built with the Detox test flag active
**Then** animations are disabled via the environment flag (AD-8); entries appear in the list instantly so Detox assertions can proceed without timing dependencies

**Given** the list source of truth
**When** any animation plays
**Then** the data driving the list is always Conchita's confirmed response — no optimistic rendering of unconfirmed raw input

---

### Story 3.5: Home Screen Window & Period Configuration

As Marc the user,
I want to filter my Home list by a configurable time period and set my preferred default in Settings,
So that I only see the expenses relevant to the time window I care about.

**Acceptance Criteria:**

**Given** the Settings screen → VISUALITZACIÓ section
**When** rendered
**Then** a "Periode per defecte" picker is present with options: Mes actual, Últims 30 dies, Últims 7 dies, Setmana actual; the current selection is shown; selection opens a Drum Roller picker

**Given** Marc selects a period in Settings
**When** the selection is saved
**Then** the choice is persisted to MMKV and applied as the default Home Screen Window on every subsequent app launch

**Given** the Home screen
**When** the selected window is "Mes actual"
**Then** the header shows the current month name + year (e.g. "agost 2026") and the list shows only entries within the current calendar month; the grand total reflects only those entries

**Given** the selected window is "Últims 30 dies", "Últims 7 dies", or "Setmana actual"
**When** the Home screen renders
**Then** the period sublabel matches the selection (e.g. "últims 30 dies") and list + grand total are filtered accordingly

**Given** the period filter is active
**When** entries outside the selected window exist in the backend
**Then** they are not fetched or displayed; the fetch request includes the date range as query parameters

**Given** the filtered list is empty (no entries in the selected window)
**When** the Home screen renders
**Then** the standard empty state is shown ("Encara no hi ha despeses.")

**Given** FR-9 includes a "last N expenses" window option
**When** this story is complete
**Then** the "last N expenses" option is not implemented — it is superseded by the UX spec's four fixed time periods (Mes actual, Últims 30 dies, Últims 7 dies, Setmana actual); the UX spec takes precedence and the option is deferred to V1.1 if ever needed

---

## Epic 4: Analytics

Marc can analyze his spending with period, category, subcategory, and context filter chips, interactive swipeable charts (donut/pie and bar), and a filterable expense list with per-entry deselect — giving the journal data a meaningful couch-browsing experience.

### Story 4.1: Analytics n8n Workflow

As Marc the developer,
I want the Analytics n8n workflow built and validated against real data before any UI story begins,
So that the Analytics screen is never blocked on untested backend logic and the API contract is confirmed end-to-end.

**Acceptance Criteria:**

**Given** the n8n instance is running
**When** the Analytics workflow is complete
**Then** it consists of exactly 3 nodes: Webhook (receives filter payload) → Postgres (parameterized query with nullable filter params for category, subcategory, context, from, to) → Respond (returns structured JSON); no client-side aggregation is performed

**Given** a test client sends a filter payload `{ from, to }` with no optional params
**When** the workflow executes against real data in PostgreSQL
**Then** the response contains a valid `AnalyticsResponse`: `totals` array matching `AnalyticsTotals` shape and `entries` array matching `Entry[]` shape (as defined in `lib/types/analytics.ts` from Story 1.3)

**Given** a test client sends a filter payload with `category`, `subcategory`, or `context` params present
**When** the workflow executes
**Then** the response is correctly filtered — only entries matching all non-null params are returned; the totals reflect only the filtered entries

**Given** the Postgres node query
**When** inspected
**Then** it uses parameterized inputs only — no string interpolation, no dynamic SQL construction; TypeScript `any` equivalent SQL anti-patterns are absent

**Given** this story is complete and results are validated
**When** Epic 4 Story 4.2 begins
**Then** the API contract (`AnalyticsFilterParams` → `AnalyticsResponse`) is confirmed as the interface between app and n8n; no further changes to the workflow shape are permitted without updating `lib/types/analytics.ts`

---

### Story 4.2: Filter Chips

As Marc the user,
I want a row of filter chips on the Analytics screen to narrow my spending data by period, category, subcategory, and context,
So that I can slice my expenses any way I need without leaving the screen.

**Acceptance Criteria:**

**Given** the Analytics screen
**When** rendered
**Then** a horizontal scrollable filter chip row appears directly below the header, always visible, with four chips in order: Periode, Categoria, Subcategoria, Context

**Given** the Context chip
**When** contexts array in `store/referenceData.ts` is empty
**Then** the Context chip is not rendered — the row shows only Periode, Categoria, Subcategoria

**Given** an inactive filter chip
**When** rendered
**Then** it appears in the default chip style (border, `text-secondary`)

**Given** an active filter chip (a non-default value is selected)
**When** rendered
**Then** it appears in amber (`accent` background, `bg` text)

**Given** the Periode chip
**When** tapped
**Then** a Drum Roller picker opens with options: Mes actual, Últims 30 dies, Últims 7 dies, Setmana actual; selecting an option closes the picker and updates the chip label

**Given** the Categoria chip
**When** tapped
**Then** a picker opens listing all categories from `store/referenceData.ts`; selecting a category closes the picker, updates the chip, and resets the Subcategoria chip to its default (all)

**Given** the Subcategoria chip
**When** tapped
**Then** a picker opens listing subcategories belonging to the currently selected Categoria; if no Categoria is selected, all subcategories are listed

**Given** any filter chip value changes
**When** the new value is confirmed
**Then** the updated `AnalyticsFilterParams` is sent to the n8n Analytics endpoint; the chart and list below update to reflect the response; a loading indicator is shown during the request

**Given** the Analytics screen is navigated away from and back
**When** it re-renders
**Then** filter chip selections are reset to defaults (Mes actual, all categories, all subcategories, all contexts)

---

### Story 4.3: Swipeable Charts

As Marc the user,
I want to swipe between a donut chart and a bar chart to visualize my spending,
So that I can see both proportional and absolute breakdowns of my expenses in the format that suits the moment.

**Acceptance Criteria:**

**Given** the Analytics screen with data returned from the n8n workflow
**When** the chart area renders
**Then** it occupies approximately 40% of the screen height and displays the last-selected chart type (defaults to Gràfic de sectors on first open)

**Given** the Gràfic de sectors (donut/pie) chart is active
**When** rendered
**Then** it shows proportional spend by category as a donut or pie chart with a legend listing each category and its percentage or amount

**Given** the Gràfic de barres (bar chart) is active
**When** rendered
**Then** it shows total spend per category as horizontal bars, with category labels and amounts

**Given** the chart area
**When** swiped left or right
**Then** the chart type switches (sectors ↔ barres) with a swipe transition animation; a page-dot indicator below the chart area shows the current chart type

**Given** Marc switches to Gràfic de barres and navigates away and back
**When** the Analytics screen re-renders
**Then** Gràfic de barres is shown — the last-selected chart type persists across navigation within the same app session

**Given** active filters change (from Story 4.2)
**When** new data arrives from n8n
**Then** the chart updates to reflect the new data while preserving the currently selected chart type; a loading state is shown during the request

**Given** the filter produces zero results
**When** the chart renders
**Then** the chart area shows an appropriate empty/zero state (no crash, no broken chart)

**Given** all visible entries in the list (Story 4.4) are manually deselected
**When** the chart recalculates
**Then** both chart types display a zero/empty state with a plain message (e.g. "Selecciona almenys una despesa per veure el gràfic") rather than a broken or divide-by-zero render

---

### Story 4.4: Filtered Expense List

As Marc the user,
I want a list of matching entries below the chart that I can browse and individually exclude from the chart,
So that I can drill into specific entries and temporarily remove outliers from my analysis.

**Acceptance Criteria:**

**Given** the Analytics screen with active filters
**When** the list renders
**Then** only entries matching all active filter chips are shown; entries are grouped by calendar month with month section headers; the same single-line row anatomy as the Home list is used (category, subcategory, amount, date, 📎 and 🏷 indicators)

**Given** a list entry
**When** tapped
**Then** it accordion-expands to reveal description, context value (if assigned), and attachment "Obrir" link (if file exists) — same behavior as the Home list accordion

**Given** a list entry in the Analytics list
**When** the tap-to-toggle deselect affordance is tapped (a circle indicator on the left edge of the row — filled when included, empty when excluded)
**Then** that entry is excluded from the chart calculation; the chart updates immediately to reflect the exclusion; the entry remains visible in the list with an empty circle indicator and muted text styling

**Given** one or more entries are deselected
**When** the user navigates to another tab and returns to Estadístiques
**Then** all deselection state is reset; all entries are included in the chart again

**Given** a filter change (from Story 4.2) while entries are deselected
**When** the new filter response arrives
**Then** deselection state is reset; the new result set starts with all entries included

**Given** the list
**When** this story is complete
**Then** no swipe-to-reveal actions are present on Analytics list items — delete and edit are Home-screen-only in V1

**Given** active filters produce zero matching entries
**When** the Analytics screen renders
**Then** both the chart area and list area are replaced by the empty state: "Cap resultat per als filtres actius." and a "Modificar filtres" button

**Given** the "Modificar filtres" button
**When** tapped
**Then** focus moves to the filter chip row (scroll to top if needed) so Marc can adjust his filters without extra navigation

**Given** the empty state is showing
**When** Marc changes a filter chip to a value that produces results
**Then** the empty state is replaced by the chart and list with the new data; no manual refresh is required

**Given** no entries exist at all in the backend (not a filter issue — truly no data)
**When** the Analytics screen renders with default filters
**Then** the same empty state copy is shown ("Cap resultat per als filtres actius.") — this is acceptable for V1; a distinct no-data state is deferred

---

## Epic 5: Context Tagging

Marc can define trip and event contexts, activate one as the session default, have it offered per entry (activating the stubbed fields on Confirmation Card and Full Edit Screen built in Epics 2 and 3), manage contexts from a new Settings section, and see historical spending by context in Analytics.

### Story 5.1: Context Manager Screen

As Marc the user,
I want to create, rename, and delete contexts from a dedicated screen in Settings,
So that I have a clean list of tagging buckets before I start assigning them to entries.

**Acceptance Criteria:**

**Given** the Settings screen
**When** rendered
**Then** a CONTEXTOS section is present with a "Gestió de contextos ›" row that navigates to the Context Manager screen

**Given** the Context Manager screen
**When** contexts exist in `store/referenceData.ts`
**Then** each context is listed with its name, an edit icon (✏️), and a delete icon (🗑)

**Given** the edit icon for a context
**When** tapped
**Then** the context name becomes inline-editable; saving persists the updated name via the n8n endpoint and updates `store/referenceData.ts`; cancelling restores the original name

**Given** the delete icon for a context
**When** tapped
**Then** an inline confirmation appears ("Segur?") with a Danger "Eliminar" button; tapping outside cancels; tapping Eliminar sends a DELETE request to the n8n endpoint, removes the context from `store/referenceData.ts`, and removes the row

**Given** the context being deleted is currently the Active Context (set in Story 5.2)
**When** the deletion is confirmed
**Then** the active context session state is cleared automatically (equivalent to selecting "Cap context"); the Home screen indicator disappears

**Given** the Context Manager screen
**When** no contexts exist
**Then** the empty state is shown: "Encara no tens cap context." and a "+ Afegir context" button

**Given** the "+ Afegir context" button (or equivalent at the bottom of a non-empty list)
**When** tapped
**Then** a simple name-input screen opens with a single text field; saving creates the context via the n8n endpoint, adds it to `store/referenceData.ts`, and returns to the Context Manager with the new context in the list

**Given** the context name input (add or rename) contains only empty or whitespace text
**When** the save action is triggered
**Then** the save is rejected with an inline validation message "El nom no pot estar buit"; no network request is sent

**Given** the context name input (add or rename) matches an existing context name (case-insensitive)
**When** the save action is triggered
**Then** the save is rejected with an inline validation message "Aquest context ja existeix"; no network request is sent

**Given** `store/referenceData.ts` after any create, rename, or delete
**When** the Drum Rollers in Confirmation Card or Full Edit Screen are next opened
**Then** they reflect the updated contexts list without requiring an app restart or manual refresh

---

### Story 5.2: Active Context Indicator & Picker

As Marc the user,
I want to set an active context for my current session and see it indicated on the Home screen,
So that I can tag a batch of expenses to a trip or event without selecting it on every single entry.

**Acceptance Criteria:**

**Given** no context is active
**When** the Home screen renders
**Then** no context indicator is shown — the header area is unchanged

**Given** a context is active
**When** the Home screen renders
**Then** the active context indicator appears as a chip directly below the grand total header, left-aligned, before the first month section header — showing "🏷 [context name]"; it is part of the fixed header area so the expense list scrolls beneath it without the indicator shifting

**Given** the active context indicator
**When** tapped
**Then** a fast picker sheet opens with: the current active context highlighted, all other defined contexts listed, a "Cap context" option to deactivate, and a "+ Nou context" option to create a new one

**Given** Marc selects a different context in the picker
**When** the selection is confirmed
**Then** the previously active context is deactivated; the newly selected context becomes active; the indicator on the Home screen updates immediately; only one context can be active at a time

**Given** Marc selects "Cap context" in the picker
**When** confirmed
**Then** the active context is cleared; the Home screen indicator disappears

**Given** Marc selects "+ Nou context" in the picker
**When** the name-input screen opens and a name is saved
**Then** the new context is created via n8n, added to `store/referenceData.ts`, set as the active context, and the picker closes

**Given** the app is closed and reopened
**When** the Home screen initializes
**Then** no context is active — active context state is session-only and does not persist across app launches

---

### Story 5.3: Per-Entry Context Assignment

As Marc the user,
I want each entry to default to my active context and let me override it per entry,
So that batch-tagging a session is effortless while still allowing exceptions.

**Acceptance Criteria:**

**Given** a context is active when the Confirmation Card appears
**When** the card renders
**Then** the context Drum Roller is pre-selected to the active context; the field is visible (contexts now exist in `store/referenceData.ts`)

**Given** the context Drum Roller on the Confirmation Card
**When** Marc changes the selection
**Then** it can be set to any defined context, or cleared to "—" (no context); the active context for the session is not affected by this per-entry change

**Given** Marc accepts the Confirmation Card
**When** the entry is saved
**Then** the context value as shown on the card (active context, a different context, or none) is included in the save payload to n8n

**Given** no context is active when the Confirmation Card appears
**When** the card renders
**Then** the context Drum Roller defaults to "—" (no context selected); the field is visible as long as contexts exist in `store/referenceData.ts`

**Given** the Full Edit Screen for an existing entry
**When** the context Drum Roller is opened
**Then** the "+ Nou context" option at the end of the list is now fully wired — selecting it opens the name-input screen, saves the new context to n8n and `store/referenceData.ts`, and returns to Full Edit with the new context selected (completing the wire-up stubbed in Story 3.1)

**Given** the "+ Nou context" name-input screen (from Full Edit or Active Context picker)
**When** an empty or whitespace-only name is submitted
**Then** the save is rejected with an inline validation message "El nom no pot estar buit"; no network request is sent

**Given** an entry with a context assigned
**When** viewed in the Home list (collapsed or accordion-expanded)
**Then** the 🏷 badge is shown in the collapsed row; the context name is shown in the accordion-expanded detail

---

## Epic 6: Gmail Invoice Flow

Marc receives timely notifications when invoices arrive by email, can deep-link directly to review and confirm each invoice (with PDF access via the in-app viewer), register unknown senders in one tap, and manage his sender list from a new Settings section.

### Story 6.1: Known Invoice Notification & Review

As Marc the user,
I want to receive a push notification when a known supplier sends an invoice by email, and review it on an Invoice Review Card,
So that I can log email invoices in one tap without switching to my email app.

**Acceptance Criteria:**

**Given** n8n detects an email from a registered sender and processes it as a known invoice
**When** the FCM `invoice_known` message is dispatched
**Then** a push notification arrives on the device showing the sender name and extracted amount

**Given** Marc taps the `invoice_known` push notification
**When** the app opens or foregrounds
**Then** it navigates to the Invoice Review Card for that invoice

**Given** the Invoice Review Card
**When** rendered
**Then** it uses the same slide-up anatomy as the Confirmation Card and shows: amount (Special Elite, amber, editable), category Drum Roller (pre-selected from Conchita's suggestion), subcategory Drum Roller (dependent), description (editable), date (editable, defaults to the email's SMTP `Date:` header as parsed by the n8n Gmail trigger node — falls back to today's date if parsing fails), context Drum Roller (hidden if no contexts exist), sender name (read-only), PDF "Obrir" link (opens the invoice PDF in the in-app viewer)

**Given** the PDF "Obrir" link
**When** tapped
**Then** the invoice PDF opens in the in-app PDF viewer; the Invoice Review Card remains accessible after closing the viewer

**Given** Conchita's extracted category from the invoice is not found in `store/referenceData.ts`
**When** the Invoice Review Card renders
**Then** the category Drum Roller defaults to the first available category; a subtle visual indicator signals the suggestion could not be matched; the subcategory Drum Roller resets accordingly

**Given** the Invoice Review Card action buttons
**When** rendered
**Then** Descartar uses the Danger button variant; Acceptar uses the Primary button variant — matching the Confirmation Card button spec

**Given** Marc taps Acceptar on the Invoice Review Card
**When** the accept action fires
**Then** the entry data as displayed is sent to the n8n save endpoint with `Authorization: Bearer <secret>`; on success the card dismisses and the entry appears in the Home list

**Given** Marc taps Descartar on the Invoice Review Card
**When** the discard action fires
**Then** the card dismisses and no entry is saved; the invoice is not redelivered

**Given** the Invoice Review Card arrives while the app is in the foreground (no tap required)
**When** the `invoice_known` FCM data message is received
**Then** the card slides up directly without requiring a notification tap — same foreground behavior as the Confirmation Card

**Given** multiple `invoice_known` FCM messages arrive while an Invoice Review Card is already visible
**When** each subsequent message is received
**Then** it is queued; Marc reviews cards one at a time; dismissing the current card (Acceptar or Descartar) surfaces the next queued card automatically

---

### Story 6.2: Unknown Sender Notification & Registration

As Marc the user,
I want to be notified when an invoice arrives from an unrecognised sender and register them in one tap,
So that future invoices from that sender are automatically processed as known.

**Acceptance Criteria:**

**Given** n8n detects an email from an unregistered sender
**When** the FCM `invoice_unknown` message is dispatched
**Then** a push notification arrives on the device identifying the unknown sender (e.g. "Factura de remitent desconegut: factures@proveidor.com")

**Given** Marc taps the `invoice_unknown` push notification
**When** the app opens or foregrounds
**Then** it navigates to a registration screen showing the sender's email address and a single primary action: "Afegir com a proveïdor conegut"

**Given** the registration screen
**When** Marc taps "Afegir com a proveïdor conegut"
**Then** a name field is shown (pre-populated with the domain or a parsed display name as a suggestion); Marc can edit the name before saving

**Given** Marc saves the registration
**When** the save action fires
**Then** the sender is registered via the n8n endpoint; the sender entry appears in the PROVEÏDORS list in Settings (Story 6.3); a confirmation message is shown; the registration screen closes

**Given** Marc dismisses the registration screen without registering
**When** the screen is closed
**Then** the sender remains unregistered; no data is saved; future emails from this sender will continue to generate `invoice_unknown` notifications

**Given** the `invoice_unknown` FCM message arrives while the app is in the foreground
**When** the message is received
**Then** a non-blocking in-app banner or prompt appears offering the registration action — the user is not forcibly navigated away from their current screen

---

### Story 6.3: Sender Management in Settings

As Marc the user,
I want to view and manage my registered invoice senders from Settings,
So that I can keep the list accurate as suppliers change and correct any registration mistakes.

**Acceptance Criteria:**

**Given** the Settings screen
**When** rendered
**Then** a PROVEÏDORS section is present with a "Gestió de proveïdors ›" row that navigates to the sender management screen

**Given** the sender management screen
**When** registered senders exist
**Then** each sender is listed showing: display name and email address, an edit icon (✏️), and a delete icon (🗑)

**Given** the edit icon for a sender
**When** tapped
**Then** the display name becomes inline-editable; the email address is read-only; saving persists the updated name via the n8n endpoint

**Given** the delete icon for a sender
**When** tapped
**Then** an inline confirmation appears ("Segur?") with a Danger "Eliminar" button; tapping outside cancels; tapping Eliminar sends a DELETE request to n8n and removes the sender from the list; future emails from this address will generate `invoice_unknown` notifications again

**Given** the sender management screen
**When** no senders are registered
**Then** an empty state is shown: "Encara no tens cap proveïdor registrat." and a brief explanation that senders are added when an unknown invoice arrives

**Given** the sender list
**When** this story is complete
**Then** manual "add sender" from this screen is not implemented in V1 — senders are only added via the unknown sender registration flow (Story 6.2); the management screen is for edit and delete only

---

## Epic 7: Widget

Marc can log expenses from his phone's home screen without opening the app — the zero-friction capture point that anchors the daily logging habit.

### Story 7.1: Native Widget Target Spike

As Marc the developer,
I want the native widget extension targets added to both iOS and Android builds with inter-process data sharing confirmed,
So that all widget UI work is built on a validated native foundation and no toolchain surprises surface after the UI is written.

**Acceptance Criteria:**

**Given** the Xcode project
**When** the iOS WidgetKit extension target is added
**Then** the extension compiles without errors; an App Group is configured and shared between the main app target and the widget extension target; the main app can write a test value to the App Group container and the widget extension can read it back

**Given** the Android project
**When** the App Widget target is added
**Then** the widget compiles without errors; the main app can write a test value to SharedPreferences with the App Group equivalent; the widget process can read that value confirming cross-process data access

**Given** the existing CI pipeline (`pr-gate.yml`, `deploy-app.yml`)
**When** the native extension targets are added
**Then** both workflows continue to pass without modification; no existing build steps are broken

**Given** this spike fails (App Group not working on iOS, or SharedPreferences cross-process not confirmed on Android)
**When** the failure is identified
**Then** no further Epic 7 stories begin until the native configuration is resolved; the issue and resolution approach are documented in a developer note using placeholder values only

**Given** the spike is complete and confirmed
**When** Story 7.2 begins
**Then** the widget extension targets are in place and the data-sharing mechanism is the approved pattern for passing the n8n connection config (webhook URL + auth secret) from main app to widget

---

### Story 7.2: Widget UI — Full State Machine

As Marc the user,
I want the home screen widget to handle the complete entry lifecycle — resting, loading, success, and error — as a single cohesive native component,
So that I can log expenses and know the outcome without opening the app.

**Acceptance Criteria:**

**Given** the widget is added to the iOS or Android home screen
**When** it renders in its resting state
**Then** it shows a text input field and a submit button; Conchita voice copy is shown as placeholder text in the input field

**Given** the widget text input is empty or contains only whitespace
**When** the submit button is tapped
**Then** the submission is rejected; the submit button returns to its active state; no POST request is sent

**Given** Marc types an expense description in the widget
**When** the submit button is tapped
**Then** the widget sends a POST request to the configured n8n webhook URL with `Authorization: Bearer <secret>`; the webhook URL and auth secret are read from the shared App Group (iOS) or SharedPreferences (Android) — never hardcoded or stored separately in the widget

**Given** the POST request is in flight
**When** the widget is waiting for a response
**Then** a loading indicator replaces the submit button; the text input is disabled to prevent duplicate submission; Conchita loading voice copy is shown

**Given** Conchita successfully processes the widget-submitted entry
**When** the result is received
**Then** the widget transitions to a success state showing: the confirmed amount (in amber), the confirmed category, and a short Conchita voice copy line sourced from `lib/conchiCopy.ts` (`roundTripSuccess` key)

**Given** the widget is in success state
**When** a configurable timeout elapses (or Marc taps a reset control)
**Then** the widget resets to its resting state (text input ready for the next entry)

**Given** the POST request fails (network error, non-200 response, or timeout)
**When** the failure is detected
**Then** the widget transitions to an error state showing: Conchita error voice copy (sourced from `lib/conchiCopy.ts` `error` key), the original typed text preserved in the input field, and a retry button

**Given** the widget is in error state
**When** Marc taps the retry button
**Then** the original text is resubmitted to n8n; the loading state resumes

**Given** the Settings screen has not been configured (no webhook URL or auth secret stored)
**When** the widget renders
**Then** a message prompts Marc to open the app and configure the connection; the submit action is disabled

**Given** the widget is text-only
**When** this story is complete
**Then** no camera capture or PDF picker is present — this is the confirmed platform constraint (FR-1)
