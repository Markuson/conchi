# Epic 1 Context: App Foundation & Connection Setup

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Produce a production-ready app skeleton deployed to Firebase App Distribution — with working CI/CD, the complete design system, app shell navigation, the Conchi Bubble, and a Settings screen for the two features meaningful from day one: n8n connection configuration and theme selection. Epic 1 closes with a tracer bullet that proves the core causal chain (FAB tap → n8n → Conchita → raw response) works end-to-end before the quality layers of Epic 2 are added. No feature data is persisted in this epic.

## Stories

- Story 1.1: Project Skeleton & CI/CD
- Story 1.2: Self-Hosting Infrastructure
- Story 1.3: Design System Foundation
- Story 1.4: App Shell & Navigation
- Story 1.5: Settings Screen (CONNEXIÓ + TEMA + SOBRE)
- Story 1.6: Tracer Bullet — End-to-End Causal Chain

## Requirements & Constraints

**Functional (scoped to this epic):**
- n8n connection: exactly two Settings fields — webhook base URL (all endpoint paths derived from it) and auth secret (password field). No SSE endpoint. Saving triggers a validation ping; HTTP 200 → store; failure → descriptive error, nothing saved.
- Auth secret stored exclusively in `expo-secure-store` (device secure enclave). Webhook URL in MMKV. Neither ever committed.
- Theme: Clar / Fosc / Sistema. Switches immediately across the entire app. Persists across sessions.
- App version (semver from `package.json`) displayed read-only in Settings → SOBRE.
- Idioma toggle is **not** in V1 Settings — language switching is deferred to V1.1; Catalan is the only language.
- Analytics TypeScript types (`AnalyticsFilterParams`, `AnalyticsTotals`, `AnalyticsResponse`) must be committed in `lib/types/analytics.ts` as part of Story 1.3 or 1.1 — pure TypeScript, no backend work.
- `Entry` type in `lib/types/entry.ts` must have `userId: string` as a required field from day one — the compiler enforces this at every callsite.

**Non-functional (must hold for every story in this epic):**
- `pnpm` is the sole package manager; no `npm` or `yarn` in scripts, CI, or docs.
- TypeScript strict mode; no `any`; enforced by Husky pre-commit (lint + type check must both pass).
- ESLint: `@typescript-eslint/recommended-type-checked` + `eslint-plugin-react-native` + `eslint-plugin-react-hooks`; specific rule overrides defined in Story 1.1.
- All route references import from the typed `ROUTES` constant in `navigation/`; no string literals used as route names.
- `store/index.ts` aggregates and re-exports feature slices only — no business logic, no state, no selectors.
- No real VPS URLs, credentials, or tokens in any committed file; all docs use placeholder values.

**CI/CD:**
- `pr-gate.yml`: lint + type check + unit tests must pass before merge.
- `deploy-app.yml`: Android APK → Firebase App Distribution (Marc's email only); APK never attached to GitHub Releases.
- `deploy-docs.yml`: Docusaurus + Storybook web build → GitHub Pages on merge to main.
- All credentials (signing keystore, Firebase service account, FCM server key) sourced from GitHub Secrets only.

**Self-hosting infrastructure (Story 1.2, non-app-code deliverable):**
- n8n + PostgreSQL + MinIO under Docker Compose on a single VPS; all three reachable from the dev device.
- A test file must be uploadable to MinIO via the S3 API, and the returned URL must resolve without an `Authorization` header (public read access validated before Epic 2 media entry begins).
- Docker Compose setup, MinIO bucket public-read policy, and n8n S3 node credential configuration documented with placeholder values only.

## Technical Decisions

**Stack:**

| Package | Version |
|---|---|
| React Native | 0.76+ (bare, no Expo managed workflow) |
| TypeScript | 5.x strict |
| pnpm | 9.x |
| React Navigation | 7.x |
| Zustand | 5.x |
| react-native-mmkv | 3.x |
| expo-secure-store | latest compatible |
| Detox | 20.x |
| Storybook for React Native | 7.x |
| Docusaurus | 3.x |
| ESLint + @typescript-eslint | 7.x |
| Husky | 9.x |

**Source tree (established in Story 1.1, never changed after):**

```
src/
  components/
    atoms/        # Button, Icon, Badge (later: DrumRoller, FilterChip)
    molecules/    # ConchiBubble (later: ExpenseRow, MonthHeader, InputField)
    organisms/    # (later: ConfirmationCard, FilterBar, ExpenseList)
  features/
    entry/        # (later: useEntrySubmit, offlineQueue, entryStore.ts)
    settings/     # useSettings, n8n config validation, settingsStore.ts
  screens/        # HomeScreen, AnalyticsScreen, SettingsScreen (placeholders except Settings)
  store/
    index.ts      # aggregates + re-exports feature slices only
    referenceData.ts  # shared read-only slice (populated in Epic 2)
  lib/
    api/          # n8n HTTP client (auth header injection)
    fcm/          # (scaffolded in Epic 2)
    storage/      # MMKV wrapper, expo-secure-store wrapper
    types/        # Entry, Category, Context, AnalyticsFilterParams, AnalyticsResponse, AnalyticsTotals
  navigation/     # navigator, deep link config, typed ROUTES constant
docs/             # Docusaurus site
.storybook/       # Storybook configuration
.github/workflows/
  pr-gate.yml
  deploy-app.yml
  deploy-docs.yml
```

**Architecture invariants active from day one (AD-2):** `components/` never imports from `features/` or `store/`. Screens import from both; they contain no business logic. Feature hooks are co-located in their feature folder.

**Secrets contract (AD-5):** webhook secret → `expo-secure-store` only; webhook URL → MMKV; both read via `lib/storage/` wrappers; nothing committed.

**Detox setup (AD-10):** configured at project skeleton (Story 1.1), runs on Android emulator in GitHub Actions via `reactivecircus/android-emulator-runner`. Animations disabled in test builds via environment flag.

**Tracer bullet HTTP contract:** Story 1.6 POST uses `Authorization: Bearer <secret>` and sends raw text body to the configured webhook URL. No response parsing, no retry logic — just prove the chain works. Epic 2 replaces the entire flow; no tracer bullet code survives after Story 2.4.

## UX & Interaction Patterns

**Color token system (UX-DR1) — 14 tokens per mode:**

| Token | Dark | Light |
|---|---|---|
| bg | #18140f | (per DESIGN.md) |
| surface | #201a13 | |
| surface-alt | #261e15 | |
| text-primary | #fdfaf4 | |
| text-secondary | #b09870 | |
| text-tertiary | #7a6a50 | |
| accent | #c8922a | |
| accent-muted | rgba(200,146,42,0.18) | |
| accent-underline | rgba(200,146,42,0.55) | |
| rule | rgba(253,250,244,0.07) | |
| border | rgba(253,250,244,0.11) | |
| danger | #8b2020 | |
| danger-bg | rgba(139,32,32,0.22) | |
| nav-bg | #18140f | |

All components reference semantic tokens only — never raw hex values.

**Typography (UX-DR2):** Special Elite (hero: home total 32px, month total 13px accent, card amount 28px); Courier Prime (all data surfaces); System UI (shell: nav labels, buttons, section headers, field labels). Load Google Fonts: Special Elite and Courier Prime.

**Spacing (UX-DR3):** xs=4, sm=8, md=12, lg=16, xl=24, 2xl=32px. All screens apply 24px horizontal edge padding.

**Bottom nav (UX-DR4):** notched/cradle Bézier cutout at top-center; FAB elevated above bar surface inside notch; 64px height + safe area; `nav-bg` background; 1px `rule` top edge. Left: Inici (house + "Inici"). Right: Estadístiques (bar chart + "Estadístiques"). Active: `accent`; inactive: `text-tertiary`. Min tap target 44×44px.

**FAB (UX-DR5 — Epic 1 scope):** 56px amber circle. Radial fan with three mini-buttons is Epic 2 (Story 2.6); in Epic 1 the FAB tap opens only the tracer bullet plain text input.

**Conchi Bubble (UX-DR6):** 48px persistent circle, absolute top-right on every screen. Three image states: `conchi-idle.png` (default), `conchi-working.png`, `conchi-error.png`. 200ms crossfade between states. Tap → Settings. Pixel art recolor: dark outlines/jacket/hair → #2c1a0a, amber bow/accents → #c8922a, collar/cuffs → #fdfaf4, book cover → #4a2e12.

**Button component (UX-DR18):** three variants — Primary (accent bg, bg text, 44px, 4px radius, System UI 11px 700 uppercase 0.10em); Secondary (transparent, 1px border, text-secondary, 44px); Danger (danger bg, white, 44px).

**Settings screen (UX-DR14 — Epic 1 scope):** three sections with System UI 10px uppercase section headers (0.14em spacing): CONNEXIÓ (two fields only), VISUALITZACIÓ (Tema picker only; Periode per defecte and Idioma added in later epics), SOBRE (version read-only).

## Cross-Story Dependencies

- **1.1 → all:** project skeleton must be committed first; every subsequent story is built on this foundation.
- **1.2 → 1.6:** self-hosting infrastructure (live n8n reachable from dev device) must be in place before the tracer bullet can be validated.
- **1.3 → 1.4:** design system tokens must exist before the app shell composes them into nav bar and Conchi Bubble.
- **1.4 → 1.5:** app shell navigation must exist before the Settings screen can be wired to the Conchi Bubble tap.
- **1.5 → 1.6:** valid n8n connection must be configurable (and persisted) before the tracer bullet can fire an authenticated POST.
- **1.6 → Epic 2:** tracer bullet proves the transport works; Epic 2 Story 2.4 replaces the entire tracer flow with the production entry path.
