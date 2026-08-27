# Epic 1 Context: App Foundation & Connection Setup

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Stand up a production-ready, portfolio-grade React Native app skeleton — CI/CD, the full design system, app shell navigation, the Conchi Bubble, and a Settings screen covering the only two features meaningful before any data exists: n8n connection configuration and theme selection. This is the foundation every later epic builds on, so its conventions (routing, state, secrets, folder structure) must be right from the first commit — they are expensive to change later and are the part a hiring manager reading the repo will judge first. The epic closes with a tracer bullet: typing an expense and seeing Conchita's raw response, proving the FAB → n8n → Conchita causal chain end-to-end before any quality layer (Confirmation Card, FCM, styling) is built on top of it.

## Stories

- Story 1.1: Project Skeleton & CI/CD
- Story 1.2: Self-Hosting Infrastructure
- Story 1.3: Design System Foundation
- Story 1.4: App Shell & Navigation
- Story 1.5: Settings Screen (CONNEXIÓ + TEMA + SOBRE)
- Story 1.6: Tracer Bullet — End-to-End Causal Chain

## Requirements & Constraints

- n8n connection config has exactly two fields: webhook base URL (all endpoint paths derive from it) and auth secret (Bearer token, password field). No SSE/endpoint field. Saving triggers a validation ping to n8n; only HTTP 200 persists the config; failure shows a descriptive error and saves nothing.
- Theme (Clar/Fosc/Sistema) applies instantly app-wide with no restart, and persists across sessions, applied before first paint on relaunch.
- Idioma (language) toggle is explicitly out of scope for V1 — Catalan only, deferred to V1.1.
- App version (semver from `package.json`) is displayed read-only in Settings.
- TypeScript strict mode, no `any`, enforced by a Husky pre-commit hook (lint + type check both block the commit). `pnpm` is the sole package manager everywhere (scripts, CI, docs) — no npm/yarn.
- Three CI workflows are required: PR gate (lint + type check + tests, blocks merge), app deploy (Android APK → Firebase App Distribution, invite-only to Marc's email, never attached to a GitHub Release since the repo is public), and docs deploy (Docusaurus + Storybook → GitHub Pages).
- All secrets (signing keystore, Firebase service account, FCM key) live only in GitHub Secrets; no real VPS URLs, tokens, or credentials in any committed file — docs use placeholder values throughout.
- Self-hosted infra (n8n, PostgreSQL via Docker Compose) must be reachable from the dev device before this epic's tracer bullet. Story 1.2 also stood up MinIO and validated it, but it was rejected and removed 2026-08-28 — app-uploaded files use the existing n8n Drive connection instead, so Epic 2's media entry work has no MinIO dependency (see AD-6, revised).
- The `Entry` type must require `userId: string` at every callsite from day one (multi-user-readiness, no V1.1 rework), and the Analytics API contract types must be committed in `lib/types` even though no Analytics screen exists yet — both are pure type-level deliverables with no backend work.

## Technical Decisions

- Bare React Native (no Expo managed workflow, no EAS) — Expo packages are used as libraries only. This is required so the native widget extensions (later epics) aren't blocked.
- Feature-sliced architecture: `components/` never imports from `features/` or `store/`; screens hold no business logic; each feature owns its Zustand slice and co-located hooks; `store/index.ts` only aggregates/re-exports. This is CI-enforced (ESLint import rules) starting with the skeleton.
- Reference data (categories, subcategories, contexts) will live in a shared `store/referenceData.ts` slice, owned by `features/settings/` — the one sanctioned exception to "store holds no business data," since it's read-only lookup data.
- Secrets contract: auth secret → `expo-secure-store` only, never MMKV/AsyncStorage/`.env`/committed assets. Webhook URL → MMKV. All other local persistence uses MMKV (chosen over AsyncStorage to avoid async-read flicker in later UI, and over SQLite as unnecessary overhead).
- Routing goes through React Navigation exclusively, with a typed `ROUTES` constant established in the skeleton — no string-literal route names anywhere, ever.
- Detox (E2E) and the ESLint base ruleset (`@typescript-eslint/recommended-type-checked` + `eslint-plugin-react-native` + `eslint-plugin-react-hooks`) are configured at the skeleton stage, before any feature story, so nothing is retrofitted later.
- Storybook stories are co-located with components (`ComponentName.stories.tsx`); Storybook web build and Docusaurus both deploy to GitHub Pages on merge.
- Deployment topology: single VPS running n8n + PostgreSQL under Docker Compose; no separate dev/staging — the dev device talks to the live instance. (MinIO was deployed under Story 1.2 and later removed — see AD-6.)
- Key stack versions: React Native 0.87.x, TypeScript 5.x, pnpm 9.x, React Navigation 7.x, Zustand 5.x, react-native-mmkv 3.x, Detox 20.x, Husky 9.x.
- Tracer bullet (Story 1.6) is throwaway: plain POST with `Authorization: Bearer <secret>` and raw text body, raw response rendered unstyled — no retry logic, no parsing beyond display. It must leave zero surviving code once Epic 2 ships the production entry flow.

## UX & Interaction Patterns

- Full semantic color token system (14 tokens per mode, dark + light, per the design spec) must be defined and used everywhere — components reference tokens like `tokens.accent`, never raw hex.
- Three-font system: Special Elite reserved strictly for hero amounts (home total, month total, confirmation amount) and nowhere else; Courier Prime for all data surfaces; System UI for shell chrome (nav, buttons, headers, labels).
- Spacing is token-based only (xs 4 / sm 8 / md 12 / lg 16 / xl 24 / 2xl 32px), with 24px horizontal edge padding on every screen.
- Bottom nav has a notched Bézier cutout with the FAB elevated in the notch; Inici (left) and Estadístiques (right) tabs; active state in `accent`, inactive in `text-tertiary`; 44×44px minimum tap targets; safe-area aware.
- FAB in this epic is scoped to a single tap action only (opens the tracer bullet's plain text input) — the radial fan (Escriure/Càmera/PDF) is out of scope until Epic 2.
- Conchi Bubble: 48px circle fixed top-right on every screen, tap always navigates to Settings regardless of state; idle/working/error image states with 200ms crossfade (only idle is exercised in this epic).
- Button component has three variants (Primary/Secondary/Danger), each 44px height, 4px radius, System UI 11px 700 uppercase — used as-is by Settings in this epic.
- Settings screen shows exactly three sections this epic: CONNEXIÓ (2 fields), VISUALITZACIÓ (Tema only — Periode per defecte and Idioma arrive in later epics), SOBRE (version, read-only). All copy is Catalan.

## Cross-Story Dependencies

- Story 1.1 (skeleton, routing, CI) underpins every other story in this epic and all later epics.
- Story 1.2 (self-hosting infra) must be live before Story 1.6's tracer bullet can make a real request, and before Epic 2's media entry story.
- Story 1.3 (design tokens) must exist before Story 1.4 composes them into the nav bar and Conchi Bubble.
- Story 1.4 (app shell) must exist before Story 1.5 can wire the Conchi Bubble tap to Settings.
- Story 1.5 (a valid, persisted n8n connection) is a precondition for Story 1.6's authenticated POST.
- Story 1.6's tracer bullet is explicitly disposable: Epic 2 replaces it entirely with the production Confirmation Card and FCM flow, and no tracer code should remain after that epic ships.
