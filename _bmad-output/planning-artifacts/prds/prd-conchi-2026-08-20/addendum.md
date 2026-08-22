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
2. **Analytics Query Agent** — new n8n workflow: receives filter params from the app → generates SQL → returns structured data. Does not exist today.
3. **Push notification delivery** — new infrastructure. Delivery mechanism (FCM, APNs, or a relay through n8n) is an architecture decision.
4. **Conchita LLM prompt enrichment** — detect context signals in natural language input and proactively suggest or create Contexts.

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
