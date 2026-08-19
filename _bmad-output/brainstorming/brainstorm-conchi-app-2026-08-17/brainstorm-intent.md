# Conchi App — Brainstorm Intent Document

## Product Vision

A React Native mobile app that replaces Telegram as the primary interface for **Conchita**, a personal AI accountant. The app serves two simultaneous purposes: a production tool Marc uses daily to log and review personal expenses, and a portfolio piece demonstrating full React Native mastery and project leadership (testing, CI/CD, repo docs, production-grade code quality).

**Target user:** Solo — Marc. Not a multi-user product.

---

## Core Value Proposition

Telegram works for input but offers no visibility or control. The app fixes the three real friction points Telegram cannot address:

1. **No confirmation** — you cannot see what Conchita actually registered.
2. **No correction** — misclassified categories and wrong amounts stay wrong.
3. **No analysis** — no way to query or visualize historical data.

The app beats Telegram by being **at least as fast to enter an expense** (widget-first) while adding full inspection, correction, and self-serve analytics on top.

---

## V1 Scope

**In:**
- Widget as primary log interface (tap → type or speak → Conchita processes → push notification confirms)
- Natural language / photo / PDF expense entry — same as Telegram today
- Confirmation card with inline quick-edit (drum rollers) and deeper edit screen
- Home screen: recent expenses list, monthly group totals, grand total
- Analytics screen: time selector, graph (swipeable type), filterable expense list
- Context (trip/event) tagging: create, activate, deactivate, archive, retroactive bulk-assign
- Gmail invoice notifications with deep-link into review card (view PDF preview, assign context, delete)
- Edit screen: full form with date picker, amount input, currency drum roller, description text, context drum roller
- Swipe-to-reveal edit/delete on all list items
- Settings: notification toggles (2 max), configurable home screen window, API keys, theme
- Error/timeout handling: preserve input, allow immediate retry
- Loading state: animated indicator with rotating Conchita-voice copy
- Empty state: Conchita personality copy, muted secondary style
- Post-log animation: entry slides into top of list once Conchita confirms

**Explicitly deferred:**
- AI-generated insights and pattern recognition (e.g. "you're spending too much on groceries")
- Voice entry (architecture decision for later)
- Reminder notifications for lapsed logging habit
- Structured input form (entry is always natural language / media)
- Category confidence indicator on drum roller (deferred to UX designer)
- Soft-delete with trash/recovery for contexts (unresolved; archive is the chosen default)

---

## Key UX Decisions

**Entry flow**
- Big center-bottom button: tap = text entry, press-and-hold = radial fan of 3 options (write / record / photo).
- Bottom nav: settings icon left of main button, graph icon right of main button.
- Widget is the intended daily driver; the app is the power tool.

**Confirmation card**
- Shows after full Conchita round-trip (no streaming possible — architecture constraint).
- Inline quick-edit via drum rollers (iOS time-picker style) for common fields.
- "Edit more" option buried at center-bottom for full edit screen.
- Full edit screen keeps drum rollers throughout for consistency.

**Analytics**
- Time selector at top (last week / month / year / custom).
- Main graph as centerpiece; swipe left/right to change graph type.
- List of amounts + date + description below graph.
- Filter button (icon) opens filter options; active filters shown as persistent pill (e.g. "Groceries · Last 3 months").
- User can manually deselect individual entries — correction layer for misclassifications.

**Navigation**
- Three screens: Home, Analytics, Settings. No complex navigation tree.
- Infinite scroll on Home = recent expenses only (not historical depth — use Analytics for history).
- Configurable home screen window in Settings (last month / last 30 days / last 7 days / last N expenses).

**Context tagging**
- Context persists across sessions until explicitly deactivated.
- Always-visible indicator when a context is active.
- Logging while a context is active is opt-in per entry (non-context expenses still possible).
- Combined creation: mentioning a new context name during logging creates it and assigns the expense in one flow.
- Archive (not delete) to preserve history; archived contexts reactivatable.

**Gmail invoice flow**
- Conchita detects and saves to Drive automatically; app surfaces a push notification.
- Unknown sender notification always fires (Conchita needs input, not informing).
- Known sender notification: configurable off.
- Notification settings: two toggles max — all notifications off, known-sender notifications off.
- Deep-link card: PDF preview + context assignment + delete. One place, no hunting.

**Visual identity**
- Typewriter font throughout — old-school aesthetic is core brand identity.
- Muted, desaturated category colors.
- Clean minimalist layout.
- Subtle app icon change while Conchita is processing.
- Conchita's voice present in loading copy, empty states, and confirmation language.
- Every visual decision either reinforces or breaks the Conchita character — treat as one coherent identity.

---

## Technical Constraints

**Existing Conchita backend (unchanged):**
- n8n (self-hosted) orchestrates all flows.
- PostgreSQL with tables: `transaccions`, `categories`, `remitents_factura`.
- Google Drive stores invoice PDFs.
- Google Sheets used for existing dashboard (stays in place).
- Gemini 2.5 Flash Lite for extraction and parsing.
- Current input sources: Telegram (text / photo / PDF) + Gmail auto-detection.
- App will add `'app'` as a new `origen` value in the DB. `origen` is never surfaced in the app UI.

**Architecture constraints:**
- Conchita is strictly request-response. No streaming. Confirmation card always appears after a full round-trip.
- No historical data retrieval exists today — analytics requires a **new n8n agent**: receives query params → generates SQL → returns structured data to the app.
- Conchita's LLM prompt needs enriching to detect context signals in natural input and proactively suggest new contexts.

**New infrastructure required:**
- Analytics query agent (n8n workflow + SQL generation).
- Push notification delivery for Gmail invoice events and post-log confirmations.
- React Native widget (platform-specific: iOS WidgetKit / Android App Widget).

**Portfolio requirements (non-negotiable):**
- Automated testing suite.
- GitHub Actions CI/CD pipeline.
- Repo documentation: n8n workflow export + self-hosting setup guide.

---

## Product Strategy

The product is built on a single causal chain:

**Frictionless entry → consistent data → trustworthy journal → pleasant browsing → habit**

The widget is the load-bearing component of this chain. If entry is slower or more annoying than Telegram, the habit does not form, the journal stays incomplete, and analytics become meaningless.

The analytics screen is the reward: casually browsing the expense journal on the couch is the moment that makes the habit feel worthwhile.

Conchita's character (typewriter aesthetic, personality copy, drum rollers, muted palette) is not decoration — it makes the app feel like a personal tool rather than a generic finance tracker, which is what sustains daily use.

---

## Out of Scope / Future

- AI-generated spending insights and anomaly detection (no v1 AI analysis, only self-serve analytics)
- Reminder / nudge notifications for unused-app streaks
- Voice entry (deferred — architecture TBD)
- Multi-user or shared household accounts
- Budget setting and goal tracking
- Bank/card sync or import
- Export features
- Soft-delete with trash/recovery for contexts (architecture unresolved)
- Category confidence indicator on confirmation card drum roller
