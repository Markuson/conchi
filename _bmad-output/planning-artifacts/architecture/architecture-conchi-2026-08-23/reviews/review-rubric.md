---
type: architecture-review
rubric: rubric-walker
target: ARCHITECTURE-SPINE.md
reviewed-by: claude-sonnet-4-6
date: 2026-08-23
verdict: conditional
---

# Rubric Review — Architecture Spine: Conchi App

## Verdict: CONDITIONAL PASS

The spine is structurally sound and substantially complete. It resolves the major PRD open questions (OQ-12 transport, OQ-13 analytics, OQ-15 file storage), sets enforceable rules for the critical divergence points, and maps every FR group. The conditional issues below must be addressed before the spine binds developer stories; none are fatal blockers to starting implementation if sequencing defers the affected areas.

---

## Rubric Findings

---

### 1. Fixes the real divergence points for the level below and misses none

**PASS with one gap.**

The spine covers the high-probability divergence points well: FCM vs SSE (AD-3), direct DB vs n8n (AD-4), MMKV vs AsyncStorage (AD-7), Reanimated vs Animated API (AD-8), Expo Router vs React Navigation (AD-9). 

**Gap — Analytics response shape is unresolved at spine level.** AD-4 says the analytics n8n workflow is "exactly three nodes: Webhook → Postgres → Respond" and specifies the request filter param shape in the Consistency Conventions table, but the *response envelope* (what JSON the Postgres node sends back — raw entry rows vs pre-aggregated graph payload vs two separate calls) is not defined. The PRD explicitly flags this as a required Architect deliverable ("the Architect must define... the response envelope for graph data and entry list"). Two independent builders could produce incompatible analytics store slices and feature hooks without this definition. This needs to be added to the spine or a companion spec, not left to story-level inference.

---

### 2. Every AD's Rule is enforceable and actually prevents its stated divergence

**PASS with one weak rule.**

- AD-1 through AD-14 are phrased as positive constraints with specific prohibitions. Most are enforceable via ESLint import rules (AD-2 dependency graph), Husky pre-commit (AD-5 secrets), and CI config (AD-10, AD-11).

**Weak rule — AD-13 (multi-user-ready data shapes).** The rule states "no hardcoded user identity" and "every Entry includes a `userId` field", but there is no stated enforcement mechanism. Unlike AD-2 (importable as an ESLint rule) or AD-5 (enforced by gitignore + secrets config), AD-13 has no automated check. Without an ESLint rule or a lint-time type guard, two developers could write store slices that omit `userId` and the rule would only be caught in code review. Recommend: add a TypeScript interface in `lib/types` that makes `userId` required on the `Entry` type (enforced by strict TS) and note this in the rule text.

---

### 3. Nothing under Deferred could let two independent builders diverge

**FAIL — one deferred item is divergence-prone.**

The "Navigation route strings and param shapes" item is deferred to "a project-skeleton story." The spine fixes the navigator structure (AD-9) but leaves the actual route names undefined. Two builders implementing separate features (e.g. `features/confirmation/` and `features/invoice/`) will independently define or assume route names for deep-link navigation. Since push notification tap routing (AD-3, AD-9) depends on specific route strings being agreed, this is a live divergence risk — not merely an implementation detail. The route name enum/const (even as a stub with `TODO` values) belongs in `navigation/` at skeleton time and should be called out explicitly as a skeleton deliverable in the Deferred section, not left open.

---

### 4. Named tech is verified-current

**CONDITIONAL — two items need flagging.**

| Item | Version in Spine | Finding |
|---|---|---|
| React Native | 0.76+ | React Native 0.76 was released in Oct 2024 (New Architecture on by default). As of mid-2026 RN 0.77/0.78+ may be current stable. Flag for verification — "0.76+" is forward-compatible but the min-version assumption should be confirmed before the skeleton story. |
| Storybook for React Native | 7.x | Storybook 8 for React Native was released in 2024 and is likely the current major by mid-2026. Storybook 7 may still work but `@storybook/react-native` 7.x / 8.x compatibility with Expo 52+ bare workflow should be verified before the documentation story. |
| Expo SDK | 52+ | Expo SDK 53 was released in 2025; SDK 54 may be current. "52+" is forward-compatible — acceptable. |
| React Navigation | 7.x | Current as of late 2024; likely still current. Low risk. |
| Detox | 20.x | Detox 20 was current in 2024. Verify against `reactivecircus/android-emulator-runner` compatibility at skeleton time. |
| All others | — | No immediate concerns. |

No tech in the stack appears obsolete or sunset. The two flagged items (RN min version, Storybook major) are version-pinning risks, not fatal problems.

---

### 5. Every altitude-owned dimension is decided, deferred, or an open question — nothing left silent

**FAIL — operational/environmental envelope is largely silent.**

The spine documents CI/CD at a workflow level (AD-11) but leaves the following operational dimensions entirely unaddressed:

**Missing or silent dimensions:**

a) **Deployment topology / VPS spec.** The system context diagram shows n8n, PostgreSQL, and MinIO on a "self-hosted VPS" but the spine says nothing about whether these are on one or multiple machines, containerised (Docker/Podman/native), whether PostgreSQL is managed or self-hosted binary, or what the MinIO access pattern is (same host as n8n, or separate). Builders assembling the self-hosting guide will infer different topologies.

b) **Environment model (dev / staging / prod).** The spine defines no environment distinction. There is no stated rule about which n8n instance the app talks to during development vs. production, whether the dev device talks to a staging n8n or the live instance, or how secrets are managed across environments. A solo developer with a single VPS can survive this gap in V1, but it is a silent assumption that should be made explicit ("V1: single environment — Marc's live VPS; no staging; dev device talks directly to production n8n endpoint").

c) **Error monitoring / crash reporting.** Not mentioned anywhere (not decided, not deferred, not named as out of scope). For a public-repo portfolio project this may be intentional (no Sentry/Firebase Crashlytics), but the omission should be explicit.

d) **App versioning and release naming convention.** AD-11 says APK is distributed via Firebase App Distribution but no versioning scheme (semver, date-based, build number auto-increment) is decided or deferred.

e) **Performance NFR enforcement.** The PRD specifies three performance NFRs (cold-start < 2s, round-trip < 5s, list load < 1s from cache). The spine does not reference these, does not assign them to any AD, and does not state how they are measured or gated. At minimum they should appear as non-AD conventions or be explicitly deferred.

The most significant of these is (a) — the deployment topology shapes the self-hosting guide, which is a required portfolio deliverable.

---

### 6. Covers the spec's capabilities — cross-check against PRD

**PASS.**

All 30 FRs (FR-1 through FR-30) are reachable from the Capability → Architecture Map or the AD rules. Every PRD open question that was Architect-owned is resolved:

| OQ | Subject | Resolved in spine? |
|---|---|---|
| OQ-8 | n8n connection fields | Yes — AD-5 + Consistency Conventions (bearer secret + webhook URL) |
| OQ-12 | Transport protocol (SSE vs other) | Yes — AD-3 (FCM replaces SSE) |
| OQ-13 | Analytics endpoint strategy | Yes — AD-4 (three-node n8n, parameterised SQL) |
| OQ-15 | File storage backend | Yes — AD-6 (MinIO) |

**One minor gap:** FR-28 states "All notifications off" overrides everything except Unknown Sender. The spine (AD-3) defines FCM message types and the foreground/background handler but does not state where the notification suppression logic lives when the "all notifications off" toggle is active. This is a small implementation detail but affects the `lib/fcm/` message handler design.

---

### 7. Capability → Architecture Map covers all major FR groups

**PASS.**

The map covers all 30 FRs either by individual entry or by group, and correctly identifies the governing ADs. The coverage is complete.

**Minor note:** FR-28 (notification toggles) is grouped under FR-27–30 → Settings feature, which is correct. But the push-infrastructure row (`lib/fcm/`) does not reference AD-5 (secrets — the FCM server key must not be committed), which is a small omission in the governing-AD column.

---

### UX Spec Consistency Check

**FAIL on one critical inconsistency; PASS on the rest.**

**Critical inconsistency — SSE endpoint in Settings vs FCM-only spine.**

The UX Experience spec (EXPERIENCE.md) defines a Settings screen with two CONNEXIÓ fields:
- URL del webhook
- **Endpoint SSE** — "n8n SSE endpoint URL for receiving results"

The spine's AD-3 explicitly replaces SSE with FCM as the unified async channel. The FCM channel requires no app-side SSE endpoint — results arrive via push, not via a persistent connection the app opens. This means:
- The "Endpoint SSE" Settings field in the UX spec is architecturally dead — it configures a transport that does not exist in the chosen architecture.
- The UX spec needs to be updated to remove this field, or replaced with FCM-relevant config (e.g. a device token registration indicator or a test-push button).
- If the UX spec ships as-is and a developer implements the Settings screen from EXPERIENCE.md, they will wire up an SSE endpoint field that the backend never uses. The spine must either explicitly call out this inconsistency and mandate a UX spec update, or add a spine-level convention that overrides it.

The spine's preamble lists EXPERIENCE.md as a source document, which means it was presumably read. The SSE→FCM switch should have triggered an explicit note that the UX spec's CONNEXIÓ section needs revision. This is the most actionable finding from this review.

**Other UX/spine consistency checks:**

| UX spec assumption | Spine decision | Consistent? |
|---|---|---|
| Two-phase loading (Phase 1 POST, Phase 2 SSE push) | AD-3 uses FCM push, not SSE, for Phase 2 completion signal | Partially inconsistent — the phase model is fine, but Phase 2 completion arrives via FCM onMessage, not SSE. The UX spec's "SSE response arrives" language needs updating to "FCM message arrives". |
| Confirmation Card has Descartar / Acceptar buttons | Not addressed in spine | Consistent — spine correctly defers card anatomy to UX spec. |
| Analytics has only 2 chart types (donut/pie + bar) | PRD says 3 (donut, pie, bar) | UX spec collapses donut and pie into one ("Gràfic de sectors") and has bar. Spine does not resolve this discrepancy. Minor. |
| Context creation from Full Edit screen (OQ-14 resolved in UX spec) | Deferred in spine | Consistent — spine defers context creation surfaces to UX spec, UX spec resolves it. |
| Configuració accessed via Conchi bubble tap | Spine names SettingsScreen as a main screen | Consistent — navigation detail deferred to UX spec, not a spine-level concern. |

---

## Summary of Findings

| # | Severity | Finding |
|---|---|---|
| F-1 | HIGH | Settings screen in UX spec has an "Endpoint SSE" field for a transport the spine explicitly eliminated. Spine must mandate UX spec correction before the Settings screen story. |
| F-2 | HIGH | Operational/environmental envelope is silent: no deployment topology decision (single VPS vs multi-host), no environment model (dev vs prod), no crash reporting stance, no versioning scheme. |
| F-3 | MEDIUM | Analytics response envelope (graph payload + entry list shape) is not defined at spine level, creating a live divergence risk for analytics feature implementation. |
| F-4 | MEDIUM | Navigation route strings deferred without a "skeleton-story" sequencing guard — two feature authors can independently define conflicting route names before the skeleton establishes the shared enum. |
| F-5 | LOW | AD-13 (multi-user-ready) has no enforcement mechanism. Adding `userId: string` as required on the `Entry` TypeScript type in `lib/types` would make the rule self-enforcing. |

---

## Recommended Actions (in priority order)

1. **Add a spine note** explicitly flagging the UX spec's "Endpoint SSE" CONNEXIÓ field as invalid given AD-3, and requiring the UX spec to be updated before the Settings story is written.
2. **Add an "Operational Envelope" section** to the spine (or a companion ADR) that states the V1 single-VPS topology assumption, the single-environment model, and explicitly calls out crash reporting and app versioning as out-of-scope for V1 (if that is the decision).
3. **Add the analytics response envelope** to the Consistency Conventions table: at minimum, the shape of the response from the three-node analytics n8n workflow (fields, types, whether graph aggregation is in the response or computed client-side from the raw list).
4. **Move route name stub** from Deferred to the skeleton story requirement: a `ROUTES` const in `navigation/` must exist with at least stub values before any feature story that touches navigation.
5. **Add `userId: string` to the `Entry` type definition** in the spine's Consistency Conventions, making AD-13 enforceable by TypeScript strict mode.
