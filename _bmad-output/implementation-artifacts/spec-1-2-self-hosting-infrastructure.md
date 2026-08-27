---
title: 'Story 1.2 — Self-Hosting Infrastructure'
type: 'chore'
created: '2026-08-27'
status: 'done'
review_loop_iteration: 0
baseline_commit: 92745b900ac79ae2452c1bd586af8a41aed742be
context:
  - _bmad-output/implementation-artifacts/epic-1-context.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** n8n and PostgreSQL are already running on Marc's VPS — only MinIO (and the n8n S3-node connection to it) is missing. No MinIO config or connection documentation exists yet, and every later story (Epic 2's media entry, Story 1.6's tracer bullet) depends on MinIO being reachable and public-read-validated.

**Approach:** A self-contained `self-hosting/` folder: a standalone `docker-compose.yml` running only MinIO, `.env.example` (placeholders only), and a `README.md` guide covering setup, bucket public-read policy, and wiring n8n's existing S3 node to it. Marc takes the folder, runs `docker compose up`, and verifies manually — no live infrastructure touched from this environment.

## Boundaries & Constraints

**Always:**
- All deliverables live under one top-level `self-hosting/` folder, not scattered across `docs/` or repo root
- `docker-compose.yml` defines MinIO only — n8n/PostgreSQL are pre-existing, out of scope, and untouched; compose must work standalone regardless of how they're deployed
- MinIO is the file store for app-uploaded photos/PDFs; Google Drive remains the separate, unmodified Gmail-invoice pipeline (AD-6)
- Guide notes MinIO should run on the same host as existing n8n/PostgreSQL per the single-VPS topology (AD-17), even though compose itself is standalone
- `.env.example` and the guide use placeholder values only (e.g. `your-minio-host.example.com`) — no real host, credential, or token ever committed; `.env` stays gitignored
- pnpm remains the sole package manager referenced in any doc/script touched

**Ask First:** none — scope confirmed with Marc (MinIO only, config + docs, manual verification, one folder)

**Never:**
- Reach, provision, SSH into, or verify any real VPS from this environment
- Add or modify GitHub Actions workflows
- Wire the compose stack into app code (Settings webhook-URL is a separate later story)
- Fold the guide into the Docusaurus docs site — it stays a plain file so the folder is portable

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| MinIO boot | `docker compose up` with `.env` from `.env.example` | minio container reaches healthy state; bucket exists with public-read policy | Guide documents healthcheck/log commands for a container that won't go healthy |
| n8n → MinIO connection | n8n's S3 node configured with this MinIO's endpoint + credentials | Upload succeeds against the new instance | Guide covers common failures: wrong endpoint, path-style vs virtual-host addressing, unreachable network |
| MinIO public read | Anonymous `fetch()` on an object URL, no `Authorization` header | 200 with file bytes | Guide documents the `mc anonymous set download` bucket-policy fix for a 403 |
| Credential hygiene | `.env.example` and `README.md` reviewed | Every value is an obvious placeholder | N/A |

</frozen-after-approval>

## Code Map

- `self-hosting/docker-compose.yml` -- new: standalone `minio` service, named volume, healthcheck, config from `.env` — no n8n/postgres services
- `self-hosting/.env.example` -- new: placeholders for `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `MINIO_BUCKET`, `MINIO_PORT`, `MINIO_CONSOLE_PORT`
- `self-hosting/README.md` -- new: standalone compose usage, MinIO bucket creation + public-read policy (`mc` client or console), wiring the existing n8n S3 node to this instance — plain file, outside Docusaurus, so the folder is portable

## Tasks & Acceptance

**Execution:**
- [x] `self-hosting/docker-compose.yml` -- standalone `minio` service, healthcheck, named volume, `.env`-driven config -- the runnable instance every AC depends on
- [x] `self-hosting/.env.example` -- placeholder value per compose-consumed var -- lets Marc copy-to-`.env` without guessing names
- [x] `self-hosting/README.md` -- compose usage, bucket + public-read policy steps, n8n S3-node wiring, troubleshooting (incl. same-host/network reachability, path-style addressing) -- one portable, placeholder-only guide

**Acceptance Criteria:**
- Given `docker-compose.yml`, when read, then it defines exactly one service (minio) with a healthcheck and named volume, all credential/host values from `.env`, no n8n/postgres services
- Given `.env.example`, when reviewed, then every compose-referenced variable has a placeholder entry and no entry is a real value
- Given `README.md`, when read, then it documents compose setup, bucket public-read policy, and pointing the existing n8n S3 node at this instance, placeholders only
- Given `self-hosting/`, when grepped, then no real VPS hostname, credential, or token appears anywhere

## Spec Change Log

## Design Notes

MinIO runs standalone but must share a host/network with the existing n8n so the S3 node can reach it without exposing it publicly beyond the bucket's own public-read objects. Only the single upload bucket gets public-read (AD-6) — not the MinIO root. n8n's S3 node needs endpoint, region (any placeholder), access/secret key, and "force path style" enabled — MinIO's default addressing differs from AWS S3's, the most common connection mistake.

## Verification

**Commands:**
- `grep -riE "https?://[a-z0-9.-]+\.(com|net|dev|io)" self-hosting/*` -- expected: no matches besides `example.com` placeholders
- `docker compose -f self-hosting/docker-compose.yml config` -- expected: exits 0, no real daemon/credentials required

**Manual checks (if no CLI):**
- Marc runs `docker compose up` from `self-hosting/` on his VPS alongside his existing n8n/PostgreSQL, confirms MinIO healthy, bucket resolves a file URL with no `Authorization` header, n8n's S3 node connects, and the guide matches what he did — reported back out-of-band

## Suggested Review Order

**MinIO service definition**

- Entry point — standalone `minio` service, no n8n/postgres, config from `.env`.
  [`docker-compose.yml:1`](../../self-hosting/docker-compose.yml#L1)

- Root credentials fall back to an obviously-fake placeholder, not MinIO's real default, if `.env` is missing.
  [`docker-compose.yml:11`](../../self-hosting/docker-compose.yml#L11)

- Image pinned to a specific release instead of floating `latest`, for infra holding financial records.
  [`docker-compose.yml:3`](../../self-hosting/docker-compose.yml#L3)

**Bucket public-read policy (review-loop correction)**

- Primary policy is GetObject-only JSON, not the broader canned policy — confirmed via live test that it blocks anonymous bucket listing.
  [`README.md:63`](../../self-hosting/README.md#L63)

- Commands to apply it, plus the canned-policy alternative now explicitly labeled as also granting listing.
  [`README.md:68`](../../self-hosting/README.md#L68)

**Network exposure & operational guardrails**

- Ports publish to all host interfaces by default — firewall/binding guidance added since the guide's own goal is private-network reachability.
  [`README.md:45`](../../self-hosting/README.md#L45)

- `docker compose down -v` destroys uploaded files — called out since it looks like routine cleanup.
  [`README.md:214`](../../self-hosting/README.md#L214)

- Credential rotation via `.env` doesn't retroactively apply once the volume has initialized state.
  [`README.md:173`](../../self-hosting/README.md#L173)

**n8n S3-node wiring**

- Force Path Style is the most common MinIO/n8n connection mistake — called out explicitly.
  [`README.md:138`](../../self-hosting/README.md#L138)

**Supporting config**

- `.env.example` placeholders, one per compose-consumed var, with bucket-naming constraints noted.
  [`.env.example:12`](../../self-hosting/.env.example#L12)

- `.gitignore` exception so `.env.example` isn't swallowed by the `.env.*` ignore rule while real `.env` stays ignored.
  [`.gitignore:47`](../../.gitignore#L47)
</content>
