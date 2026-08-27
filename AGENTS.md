<!-- bmad:context -->
<!-- Verified 2026-08-25 against 02636a8d148c1a14e288a38a7856d74ebe3309ac. Managed by bmad-project-context; edits inside this block are replaced on refresh. Keep anything you want preserved outside the markers. -->

## Conchi

Bare React Native mobile app — mobile interface to Conchita, a self-hosted AI accounting agent (n8n + PostgreSQL + Google Drive). TypeScript 5.x strict, pnpm 9.x, Zustand 5, MMKV, Reanimated, expo-notifications (FCM). Planning artifacts in `_bmad-output/planning-artifacts/`; read the architecture spine before touching any source.

## Policy

- Never push directly to main — PRs only.
- Never commit secrets, `.env` files, or real VPS URLs. Webhook secret lives in `expo-secure-store` only — never MMKV, never committed.
- Never attach APKs to GitHub Releases — deploy to Firebase App Distribution only.
- Never use npm or yarn — pnpm is the sole package manager in scripts, CI, and documentation.
- All UI copy in Catalan (V1); Spanish never appears anywhere in the app.
- GitHub Actions Secrets hold all server-side credentials; none in workflow YAML.

## Where things are

- Architecture spine (read before writing source): `_bmad-output/planning-artifacts/architecture/architecture-conchi-2026-08-23/ARCHITECTURE-SPINE.md`
- UX spec: `_bmad-output/planning-artifacts/ux-designs/ux-conchi-2026-08-22/EXPERIENCE.md`
- Epics and stories: `_bmad-output/planning-artifacts/epics.md`
- All user-visible strings: `src/lib/i18n/locales/ca.ts` (source of truth); future languages add a sibling file with identical keys
- CI: `.github/workflows/` — `pr-gate.yml` (lint + typecheck + unit + Detox E2E), `deploy-app.yml` (Firebase App Distribution), `deploy-docs.yml` (GitHub Pages)

## Running and verifying

TODO — exact commands established in Epic 1 Story 1.1 (project skeleton). Verify and update this block on first refresh after skeleton lands.

- Detox E2E runs on Android emulator — start the emulator before running the suite.
- CI runs typecheck separately from the test script; both must pass on every PR.
- After moving files or changing imports, run `pnpm lint` before committing.

## Conventions that differ from defaults

- **`components/` has no imports from `features/` or `store/`** — a component that needs store or API access gets a companion hook co-located in its feature folder instead.
- **`store/referenceData.ts`** is the only store-level slice with business data; `features/settings/` is the sole writer. All other features read from it.
- **All user-visible strings go through `t()` — no string literals in JSX.** Keys are English and namespaced (`home.header.total`, `entry.fab.write`); values are Catalan in V1. Enforced by `eslint-plugin-i18next` in the pre-commit hook. Conchi personality copy lives in the `conchi` namespace of the locale file, not in a separate constants file.
- **Icons: `@tabler/icons-react-native`, explicit named imports only** — never barrel imports (`import { IconHome } from '@tabler/icons-react-native'`, not `import * as Icons`).
- **Branch naming:** `story/N.M-short-slug` for story work · `fix/short-slug` for bug fixes · `dev/short-slug` for quick experiments.
- **PR title:** `[conchi] Clear concise description`.

## Known pitfalls

- **UX spec shows "Endpoint SSE" in Settings CONNEXIÓ** — superseded by the architecture (AD-15). Settings has exactly two fields: webhook base URL and auth secret. No SSE field.
- **`lib/fcm/` must not import from `features/`** — the FCM bridge is a typed event emitter only; feature callbacks register on it from the app shell (see AD-3).
- **No staging instance — all submissions hit the live `contable` DB.** Prefix the `description` field of every test entry with `TEST`. At the end of any session that submitted test data, list all submitted entries so Marc can clean them up manually.
- **Entries are never optimistic** — only confirmed FCM `round_trip_result` responses enter the entry list. Contexts use optimistic local update (MMKV + store); entries do not.

<!-- /bmad:context -->
