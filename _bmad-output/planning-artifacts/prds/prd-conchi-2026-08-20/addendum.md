# Conchi App — PRD Addendum

*Content that belongs in a downstream document or earned a place but does not fit the PRD itself.*

---

## Repository License

Marc wants the repo to be publicly forkable for learning purposes but protected against commercial copying (i.e., someone taking the code and shipping a paid product). Candidate licenses:

- **Business Source License (BSL / BUSL-1.1)** — allows use and modification; prohibits production use in competing commercial products. Converts to Apache 2.0 after a specified date (e.g. 4 years). Used by HashiCorp, MariaDB.
- **CC BY-NC 4.0** — non-commercial use only. Well-understood for creative work but not standard for software; may cause confusion in the developer community.
- **Custom "Commons Clause" over MIT/Apache** — adds a commercial-use restriction on top of an otherwise permissive license. Controversial in OSS community but widely used.

**Recommendation:** BSL is the strongest fit — it's developer-recognizable, has a clear sunset to open-source, and explicitly carves out non-commercial use. Decide before first public push.

---

## V1.1 Roadmap Items (Named by Marc)

These are not "someday maybe" — Marc explicitly named them as next after V1:

1. **Voice entry** — FAB radial fan already has a placeholder. Architecture must define the voice-to-text transport (on-device vs. cloud STT) when V1.1 planning begins.
2. **Partner access (single additional user)** — Marc's girlfriend. Not multi-tenant SaaS; a second account on the same n8n instance. V1 architecture constraint: no structural barriers to this addition.

---

## Widget Platform Constraints (for Architect)

Researched August 2026. Widget media entry is **not feasible** on either platform:

- **iOS WidgetKit:** Widgets run in a sandboxed extension process. AppIntents (iOS 16+, expanded iOS 17/18, and iOS 26/WWDC 2025) allow buttons and toggles to trigger background code, but cannot present full-screen UI flows. `UIImagePickerController` and `PHPickerViewController` require a UI context that is not available from a widget extension. There is no API path to camera or photo library from within a WidgetKit widget on any released or announced iOS version.
- **Android App Widget:** App Widgets render via `RemoteViews` inside the launcher process. There is no `startActivityForResult` equivalent from a widget; camera and file-picker flows both require receiving an Activity result callback — architecturally impossible from the widget context.

**Confirmed outcome for FR-1:** Widget is text-only. No media-capable widget variant is possible without navigating the user to the main app.

**Suggested convenience pattern (UX decision):** A secondary widget button that fires a deep-link directly into the app's camera/receipt capture screen, minimizing steps for receipt capture without requiring widget-level media access.

---

## File Storage for App-Uploaded Files (for Architect)

*Research conducted August 2026. Scope: photo receipts and PDFs uploaded via the FAB (FR-3). Gmail invoice PDFs already stored on Google Drive via existing pipeline — that path is unchanged.*

**Why Google Drive is not the right target for app uploads:** Drive is correct for the Gmail PDF pipeline (n8n has a native Drive node, already wired). For app-uploaded files, the mobile client cannot use a service account directly — uploads would need to proxy through n8n anyway, and Drive adds OAuth complexity without meaningful benefit. "Stores files in Google Drive" also reads as a hobby-project pattern on a portfolio piece.

**Options evaluated:**

| Option | Cost | n8n integration | Ops overhead | Privacy | Portfolio signal |
|---|---|---|---|---|---|
| **MinIO** (self-hosted) | Free (VPS storage) | S3 node, confirmed compatible | Docker Compose addition + TLS | Full self-hosted | Strong — shows infra skill |
| **Cloudflare R2** | 10 GB free, $0.015/GB after, zero egress | S3 node (custom endpoint) | Near-zero | US cloud | Modern, clean choice |
| **Backblaze B2** | 10 GB free, $0.006/GB after | S3 node (custom endpoint) | Near-zero | US cloud | Practical, defensible |
| **Supabase Storage** | 1 GB free | S3 node or HTTP node | Near-zero | EU/US cloud | Known stack, but free tier **pauses after 1 week inactivity** — risky for sporadic personal use |
| **Google Drive** (app uploads) | Free (15 GB quota) | Native Drive node | Low | Google cloud | Awkward for mobile upload target; fine for Gmail PDFs |

**Recommendation:** **MinIO** if self-hosted purity is the priority (privacy-first, portfolio signal, already running a server). **Cloudflare R2** if zero operational overhead is preferred (no egress fees, no pausing, S3-compatible). At Marc's usage volume (< 500 MB/year), cost is irrelevant across all options.

**Architecture note:** Both recommended options are S3-compatible. The app uploads files to n8n via the existing transport (OQ-12); n8n stores the file and returns the URL; the URL is stored in the DB alongside the Entry. The app fetches files directly from the storage URL at read time. This keeps the upload path through n8n (single backend principle) while allowing direct-read from storage (no n8n hop needed for viewing).

---

## Existing Backend Architecture (for downstream agents)

The Conchita backend is self-hosted and not modified by this project except where noted. This is the current state:

- **Orchestration:** n8n (self-hosted)
- **Database:** PostgreSQL. Relevant tables: `transaccions`, `categories`, `remitents_factura`
- **File storage:** Google Drive (invoice PDFs)
- **Existing dashboard:** Google Sheets (stays in place, not replaced)
- **LLM:** Gemini 2.5 Flash Lite (extraction and parsing)
- **Current input sources:** Telegram (text / photo / PDF), Gmail auto-detection

**Changes required for V1 (backend):**
1. New `origen` value `'app'` added to `transaccions`. Never surfaced in the UI.
2. **Analytics Endpoint** — new backend deliverable: receives structured filter params from the app → queries the DB → returns pre-aggregated graph data + raw entry list. Does not exist today. Implementation strategy is an Architect decision (OQ-13). Hard constraint: no direct DB access from the app — all data must flow through n8n. Marc's preferred approach is deterministic SQL built programmatically in n8n from the app's finite, well-defined filter params (no AI agent). Alternatives (local device DB replica, app-side SQL construction) are also on the table for the Architect to evaluate.
3. **Push notification delivery** — new infrastructure. Delivery mechanism (FCM, APNs, or a relay through n8n) is an architecture decision.
4. **App-to-Conchita transport layer** — Marc's preferred pattern: app POSTs to an n8n webhook (immediate 200 acknowledgement) → n8n pushes result back via Server-Sent Events (SSE). This requires modifications to the existing n8n entry-processing flow to support SSE push after processing. The current flow is synchronous Telegram-style; the new flow needs an async response path. Architect to validate SSE feasibility in self-hosted n8n and define the required flow changes (see OQ-12). If SSE is not suitable, an alternative transport (long-poll, webhook callback to app) should be evaluated. The chosen transport also determines the connection fields Marc must configure in Settings (FR-27) and enables the two-phase UX distinction from OQ-11.

**Not changed:**
- Core Conchita extraction pipeline
- Gmail monitoring and Drive storage
- Google Sheets dashboard
- DB schema (beyond `origen` value)

---

## Competitive Landscape Digest

From research conducted during PRD Discovery (August 2026):

**Closest competitor:** MonAi (iOS + Android, 4.8★, 8,500+ ratings). NLP/voice/Apple Pay input, iCloud-local data, widget support, Apple Shortcuts. Weakness: no deep analytics, no context tagging, no self-hosted backend.

**Differentiation gap Conchi fills:** privacy-first (self-hosted, no cloud vendor) + widget-first capture + deep AI-powered analytics + Conchita character. No existing app combines all four.

**React Native in this space:** No significant consumer expense tracker has publicly shipped on React Native. The space is dominated by native Swift/Kotlin (Copilot, Monarch) or suspected Flutter. React Native with portfolio-grade quality is a legitimate differentiator for the portfolio angle.
