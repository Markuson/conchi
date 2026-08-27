# Sprint Change Proposal — 2026-08-27

**Trigger:** Marc, reconciling MinIO's file-storage decision with real usage.

## 1. Issue Summary

Story 1.2 (self-hosting infrastructure) stood up a self-hosted MinIO instance per AD-6, on the reasoning that Google Drive was unsuited for app-uploaded files (OAuth complexity, no clean mobile upload target). Working through the actual n8n wiring surfaced two problems with that reasoning:

- **The OAuth-complexity argument doesn't hold.** Uploads were always going to proxy through n8n (never direct mobile→Drive), and n8n already has a working, authenticated Drive connection for the Gmail-invoice pipeline. Reusing it for FAB uploads adds no new OAuth setup.
- **MinIO's "direct URL read, no n8n hop" requirement needs public reachability**, which the current self-hosted, private-network MinIO doesn't have — Marc would need to stand up Tailscale or a Cloudflare Tunnel (plus harden bucket-listing/key-entropy/console exposure) to view files from outside his home network, which Drive already provides for free today.

The one surviving reason for MinIO — "shows infra skill" / avoids a "hobby-project" storage pattern on a portfolio piece (`addendum.md`, "File Storage for App-Uploaded Files") — is a narrative call, not a functional requirement, and Marc has decided it isn't worth the added ops burden right now.

**Decision:** revert app-uploaded file storage (photo receipts, PDFs via FAB) to Google Drive, reusing the existing n8n Drive node/credentials — the same pipeline already serving Gmail invoice PDFs. MinIO self-hosting stays a documented possible future migration, not the current architecture.

## 2. Impact Analysis

**Epic impact:**
- **Epic 1** — already shipped. Story 1.2's MinIO infrastructure is not rolled back (it's real, working, reusable infra) but is no longer a hard prerequisite for Epic 2. Annotated as superseded, not deleted or rewritten.
- **Epic 2 (backlog, not started)** — Story 2.6 (Media Entry) and the epic's MinIO-validation design-note gate are re-targeted from MinIO to Drive before any implementation starts. No epics added, removed, or resequenced.

**Artifact conflicts found:**
- PRD: OQ-15 and FR-24's file-preview description assume a MinIO/Cloudflare-R2 backend.
- Architecture spine: AD-6 (the core decision), AD-17 (deployment topology), AD-5's credential list, the component and system-context Mermaid diagrams, and the FR-summary table all reference MinIO as current.
- Epics: FR-3 and FR-24 summary rows, NFR-7, AD-17 recap, Epic 1's infra-prerequisite design note, Epic 2's MinIO-validation-gate design note, and Story 2.6's AC all reference MinIO as the live target.
- Addendum: the original research/recommendation section is now superseded (kept for history, annotated).
- `deferred-work.md`: has a now-moot item (update `intro.md` from Drive→MinIO) and needs a new item recording the deferred migration.
- `AGENTS.md`: the bmad:context one-line stack summary says MinIO.
- `self-hosting/README.md`: needs a status note that it's built but not currently wired into the app.
- **No change needed** — root `README.md` and `docs/docs/intro.md` already say Google Drive (the MinIO update from Story 1.2 was itself a deferred item that never got actioned — good, saves a revert).
- **No change needed** — `sprint-status.yaml` (no epic/story added or removed; Story 1.2 stays `done`, Epic 2 unaffected in tracking).
- **No change needed** — `Entry.fileUrl` type / `transaccions.drive_url` DB column: Drive's URL fits the existing column semantics already; no schema churn either direction.

## 3. Recommended Approach

**Option 1 — Direct Adjustment.** Update the planning/architecture artifacts in place to reflect Drive as current; keep the MinIO self-hosting code as-is but clearly marked inactive/future; re-target the one not-yet-built story (2.6) and design-note gate from MinIO to Drive. No code rollback, no epic/story restructuring.

- Effort: Low (documentation only; no shipped code or schema changes)
- Risk: Low (Drive path is already proven via the invoice pipeline)

Rollback (Option 2) doesn't apply — nothing needs un-shipping, since Story 1.2's deliverable (MinIO infra) is being kept, just deferred rather than reverted. MVP scope (Option 3) is unaffected — FR-3/FR-24 are unchanged in behavior, only the storage backend underneath them changes.

## 4. Detailed Change Proposals

### 4.1 `_bmad-output/planning-artifacts/prds/prd-conchi-2026-08-20/prd.md`

**§4.6, file-preview paragraph (~line 415)**
OLD: "...App-uploaded files (photo receipts, PDFs via FAB) are fetched from the storage backend chosen by the Architect (see OQ-15; MinIO or Cloudflare R2 recommended)."
NEW: "...App-uploaded files (photo receipts, PDFs via FAB) are fetched from their Google Drive URL, via the same n8n Drive pipeline used for Gmail invoice PDFs (see OQ-15, resolved)."

**§8 Open Questions, OQ-15 (~line 573)**
OLD: "15. **File storage for app-uploaded files** — ... Recommended options ... MinIO ... or Cloudflare R2 ... Architect to recommend and define the integration. Deferred to Architect."
NEW: "15. ~~**File storage for app-uploaded files**~~ — **Resolved (revised 2026-08-27).** App-uploaded files reuse the existing Google Drive pipeline via n8n's Drive node — no new storage backend, no additional OAuth setup, same `transaccions.drive_url` column as Gmail invoices. MinIO was built (Story 1.2) and stays available as a possible future migration if self-hosting the file store becomes a priority; see `deferred-work.md`."

### 4.2 `ARCHITECTURE-SPINE.md`

**AD-6 (~line 83-87)**
OLD title/rule: MinIO for app-uploaded files; direct URL reads.
NEW:
```
### AD-6 — Google Drive for app-uploaded files; direct URL reads

- **Binds:** FR-3 (photo/PDF entry), FR-24 (file preview)
- **Prevents:** a second storage backend and its own public-reachability problem (self-hosted MinIO needs a tunnel/VPN to be viewable off-network); file reads routed through n8n on every view
- **Rule:** upload path: app → n8n webhook → n8n's existing Drive node (same credential as the Gmail-invoice pipeline) → file URL stored in `transaccions.drive_url`. At view time the app fetches files directly from the Drive URL — no n8n hop. Gmail invoice PDFs and app-uploaded files now share one pipeline.

**Deferred:** MinIO self-hosting infrastructure was built (Story 1.2) and works, but isn't wired into the app — public-read access requires a tunnel (Tailscale/Cloudflare) not yet set up. Revisit as a possible future migration if self-hosting the file store becomes a priority over portfolio/ops-simplicity trade-offs. See `deferred-work.md`.
```

**AD-5, credential list (~line 81)**
OLD: "...(Firebase service account, MinIO credentials, Android signing keystore, FCM server key)..."
NEW: "...(Firebase service account, Android signing keystore, FCM server key)..."

**AD-17 (~line 155)**
OLD: "single VPS, Docker Compose: n8n + PostgreSQL + MinIO on the same host."
NEW: "single VPS, Docker Compose: n8n + PostgreSQL on the same host. (MinIO is deployed and available on the same VPS from Story 1.2 but not currently consumed by the app — see AD-6.)"

**Component diagram (~line 41)**
OLD: `lib --> minio_ext["MinIO (file read)"]`
NEW: `lib --> gdrive_ext["Google Drive (file read)"]`

**System-context diagram (~lines 205-224)**
Remove the `MinIO` node and its two edges (`n8n -->|"S3 upload"| MinIO`, `App -->|"direct file read"| MinIO`); redirect the upload edge to Drive: add `n8n -->|"upload"| GDrive` alongside the existing `App -->|"direct file read"| GDrive`.

**FR-summary table (~line 280)**
OLD: `| File preview (FR-24) | direct MinIO / Google Drive URL from lib/storage/ | AD-6 |`
NEW: `| File preview (FR-24) | direct Google Drive URL from lib/storage/ | AD-6 |`

### 4.3 `epics.md`

- **FR-3 summary row (~line 169):** "...MinIO upload" → "...Google Drive upload"
- **FR-24 text (~line 67):** "...fetched directly from MinIO URL" → "...fetched directly from Google Drive URL, same pipeline as Gmail invoice PDFs"
- **NFR-7 (~line 95):** drop "MinIO credentials" from the GitHub Secrets list (same edit as AD-5 above)
- **AD-17 recap (~line 118):** "n8n + PostgreSQL + MinIO on same host" → "n8n + PostgreSQL on same host (MinIO deployed from Story 1.2, not currently consumed — see AD-6)"
- **Epic 1 design note, infra prerequisite (~line 207):** OLD paragraph asserts MinIO "must be running before Epic 2's media entry story can be validated." NEW: replace with a short note that the self-hosting story delivered MinIO as available-but-unused infrastructure, and Epic 2's media entry now depends only on the existing n8n+Drive connection, already proven by the invoice pipeline — no new infra gate needed.
- **Epic 2 design note, MinIO validation gate (~line 222):** OLD: "MinIO upload + read validation gate... uploaded through the n8n webhook to MinIO..." NEW: "**Drive upload + read validation gate:** the media entry story (FR-3) must validate the FAB-triggered upload path end-to-end before building UI on top of it. AC must include: 'a 5MB test image sent through the n8n webhook is uploaded via n8n's existing Drive node and the returned Drive URL resolves the file without additional app-side authentication.' Validates payload size limits and that the Drive node handles an app-sourced trigger, not just the Gmail-sourced one."
- **Story 2.6 AC (~lines 808-810):** OLD: MinIO upload/URL validation AC. NEW: "**Given** the media upload flow (Drive validation AC) **When** a 5 MB test image is sent through the n8n webhook **Then** the upload succeeds via n8n's existing Drive node; the returned Drive URL resolves the file in a `fetch()` call from the app without any `Authorization` header — confirming payload size support and that the Drive node handles app-sourced uploads correctly"
- **Story 1.2 (~line 335):** add a one-line status annotation directly under the heading: "*Status note (2026-08-27): shipped as planned below — MinIO is running and validated, but the app now uses Google Drive for file storage instead (see AD-6, revised). This infrastructure is kept for a possible future migration.*" AC text below is left untouched as an accurate historical record.

### 4.4 `_bmad-output/planning-artifacts/prds/prd-conchi-2026-08-20/addendum.md`

Add a note directly above the "File Storage for App-Uploaded Files" heading (~line 41): "**Superseded 2026-08-27** — see `sprint-change-proposal-2026-08-27.md`. MinIO was built (Story 1.2) but the app reverted to Google Drive for app uploads; the analysis below is kept as a historical record of the original research, not the current decision." Original content below is left unmodified.

### 4.5 `_bmad-output/implementation-artifacts/deferred-work.md`

- Remove the now-moot item: "docs/docs/intro.md's one-line backend summary still says 'n8n + PostgreSQL + Google Drive' and should be updated to 'n8n + PostgreSQL + MinIO'..." — moot, since Drive is correct again.
- Add: `source_spec: sprint-change-proposal-2026-08-27.md` / summary: "App-uploaded file storage reverted from MinIO to Google Drive (reusing the existing n8n Drive node); MinIO self-hosting (Story 1.2) stays deployed but unused." / evidence: "OAuth-complexity rationale for avoiding Drive didn't hold once uploads were confirmed to always proxy through n8n with an already-authenticated Drive credential; MinIO's public-read requirement needs a Tailscale/Cloudflare tunnel not yet built. Portfolio-signal value of self-hosting was the only remaining reason for MinIO — Marc chose ops simplicity instead. Migration to MinIO is a possible future improvement if that trade-off changes."

### 4.6 `AGENTS.md`

**bmad:context block, project one-liner (~line 6)**
OLD: "...Conchita, a self-hosted AI accounting agent (n8n + PostgreSQL + MinIO)..."
NEW: "...Conchita, a self-hosted AI accounting agent (n8n + PostgreSQL + Google Drive; MinIO deployed but not currently used — see AD-6)..."

*(This block is normally regenerated by `bmad-project-context` — the edit is a best-effort correction until the next refresh.)*

### 4.7 `self-hosting/README.md`

Add a short status banner at the top, above the existing intro paragraph:
```
> **Status (2026-08-27):** this MinIO instance is deployed and validated but **not currently used by the app** — app-uploaded files use Google Drive instead (see AD-6 in the architecture spine). Kept as working infrastructure for a possible future migration.
```
No other changes — the setup/troubleshooting content stays accurate for whenever it's picked back up.

## 5. Implementation Handoff

**Scope classification: Minor.** Documentation-only changes, no code, no schema, no epic/story restructuring — directly implementable now.

**Handoff:** none needed beyond this session — applying immediately upon approval.

**Success criteria:** every file above accurately states Google Drive as the current app-upload storage backend, MinIO is clearly marked as deployed-but-deferred (not deleted, not silently forgotten), and no document contradicts another on this point.
