# Conchi

Bare React Native app (New Architecture, Bridgeless) — the mobile interface to
Conchita, a self-hosted AI accounting agent (n8n + PostgreSQL + Google Drive).

- React Native 0.87.x, TypeScript strict, pnpm
- React Navigation, Zustand, MMKV / `expo-secure-store`
- Detox (Android), Docusaurus + Storybook for docs

## What is Conchi

Conchi is the mobile companion to **Conchita**, a personal AI accounting agent
that today runs entirely through a Telegram bot on top of a self-hosted n8n
workflow backend. Send Conchita a short message ("12€ coffee"), a photo of a
receipt, or a PDF invoice, and it extracts the amount, category, and date
automatically — storing the result and, for receipts/invoices, filing the
original in Google Drive. It also watches Gmail for invoices from known senders
and imports those automatically.

Conchi brings that same functionality — logging expenses, reviewing history, a
spending dashboard — to a native mobile UI, talking to the same n8n backend over
webhooks instead of Telegram. The Telegram bot keeps working in parallel; Conchi
is an additional interface, not a replacement.

## Prerequisites

- Node `>= 22.11.0`
- pnpm `11.x` (`packageManager` in `package.json` pins `pnpm@11.9.0` — `corepack enable` will pick it up automatically)
- Android Studio + an emulator/device for `pnpm android` and `pnpm test:e2e`
- JDK 17 for local Android builds (CI installs this itself)
- Android SDK configured — either `ANDROID_HOME` set, or an `android/local.properties`
  with `sdk.dir=/path/to/Android/sdk` (Android Studio sets this up for you the first
  time you open the `android/` folder in it). Without one of these, `./gradlew`
  fails immediately with `SDK location not found`; GitHub's own Actions runners ship
  an SDK preinstalled, so this only matters for local builds.

## Install

```bash
pnpm install
```

This installs the root app **and** the `docs/` package in one go — it's a pnpm
workspace (`pnpm-workspace.yaml` lists `.` and `docs`). Don't run `npm` or `yarn`
anywhere in this repo; every script, CI step, and doc assumes pnpm.

> **Why `nodeLinker: hoisted`?** `pnpm-workspace.yaml` sets this explicitly. React
> Native's Gradle build does `includeBuild("../node_modules/@react-native/gradle-plugin")`,
> which needs that package physically present at the top level of `node_modules`.
> Under pnpm's default (strict, symlinked) layout it isn't — it's a transitive
> dependency of `react-native` and never gets hoisted there. `hoisted` switches the
> whole workspace to npm/yarn-classic-style flat `node_modules` so the Gradle build
> resolves correctly. Don't revert this without solving that problem another way.

## Running the app

```bash
pnpm start          # Metro bundler
pnpm android         # build + run on a connected device/emulator
pnpm ios             # build + run on iOS simulator (not covered by CI — see below)
```

## Quality gates (all run locally, and all run in CI)

```bash
pnpm lint            # eslint .
pnpm typecheck       # tsc --noEmit
pnpm test:unit       # jest — unit tests in __tests__/
```

Run all three together to reproduce exactly what `pr-gate.yml` checks (see below).

## Storybook

```bash
pnpm storybook              # dev server on http://localhost:7007 (web build, via react-native-web)
pnpm build-storybook        # static build → storybook-static/
```

The on-device Storybook UI (`@storybook/react-native`) is installed but **not wired
up yet** — `.storybook/main.cjs` only configures the web build that gets published
to GitHub Pages. See the comment at the top of that file for what's missing and why
(a Flow-syntax conflict between RN's on-device addons and the web bundler).

## Docusaurus (docs site)

```bash
cd docs
pnpm start           # dev server, live reload
pnpm build           # static build → docs/build/
pnpm serve           # serve the built output locally
```

In CI, the Storybook static build gets merged into `docs/build/storybook/` before
the whole thing deploys to GitHub Pages as one site — see `deploy-docs.yml`.

## End-to-end tests (Detox, Android only)

```bash
pnpm test:e2e
```

Targets an emulator named `conchi_e2e` (`e2e/detox.config.js`) and builds a debug
APK + test APK via Gradle first. No `.test.ts` files exist under `e2e/` yet — this
story only scaffolds the Detox config; actual specs land in a later story, and only
then does it make sense to wire this into CI.

Animations are meant to be disabled during Detox runs via a single flag —
`IS_DETOX` in `src/lib/constants.ts`, set from the `DETOX_TEST=true` env var Detox
injects (never read `process.env.DETOX_TEST` directly anywhere else). Note this flag
currently has **zero consumers**: `react-native-reanimated` isn't a dependency yet
and no screen animates, so there's nothing to disable yet. Whichever story adds
animations needs to make its animation config read `IS_DETOX`.

## Husky (pre-commit hook)

`pnpm install` runs `prepare: husky` automatically, which activates the hook in
`.husky/pre-commit`:

```sh
pnpm lint && pnpm typecheck
```

Every commit is blocked unless both pass. Deliberately **not** running here:
unit tests (slow enough to be annoying per-commit — CI is the real gate for those)
and lint-staged/partial linting (the hook lints the whole project, not just staged
files — acceptable for a solo-dev repo at this size).

If a commit ever needs to bypass this (it shouldn't, normally), that's
`git commit --no-verify` — but if lint or typecheck are failing, fix them; don't
reach for that flag as a shortcut.

## CI/CD — three GitHub Actions workflows

All three use `pnpm/action-setup@v4` pinned to major version `11` (matching
`packageManager`) and `pnpm install --frozen-lockfile`.

### `pr-gate.yml` — on every PR to `main`/`master`

Required check before merge. Runs, in order: lint → typecheck → unit tests →
Docusaurus build → Storybook build → a check that the Storybook build actually
produced output. The docs/Storybook build steps exist specifically so a broken
`docusaurus.config.js` or `.storybook/main.cjs` fails the PR instead of only
surfacing after merge (this happened once already during this story's own review —
see the spec's Loop 1 change log).

### `deploy-app.yml` — on push to `main`/`master`

Builds a signed Android release APK and distributes it via Firebase App
Distribution to an invite-only `testers` group — **never** attached to a GitHub
Release. Needs these repo secrets: `RELEASE_KEYSTORE_BASE64`,
`GOOGLE_SERVICES_JSON_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`,
`ANDROID_KEY_PASSWORD`, `FIREBASE_SERVICE_ACCOUNT`. All decoded secret files are
removed from disk in an `if: always()` cleanup step, including on a failed build.

There's no iOS build in CI yet (out of scope for this story, deferred to a later
milestone).

### `deploy-docs.yml` — on push to `main`/`master`

Builds Docusaurus, builds Storybook, merges the Storybook output into
`docs/build/storybook/`, and deploys the combined site to GitHub Pages.

## Project structure

```
src/
  navigation/     typed ROUTES + React Navigation setup — never use a route
                  name as a string literal, always import ROUTES
  screens/        top-level screens (one per route)
  features/       feature-owned Zustand slices + feature-local logic
  store/          index.ts re-exports feature slices only — no state of its own
  lib/
    types/        shared TypeScript contracts (Entry, Analytics, ...)
    storage/      MMKV + expo-secure-store wrappers
    constants.ts  cross-story compile-time flags (e.g. IS_DETOX)
  components/     shared UI — not allowed to import features/ or store/
                  directly (enforced by eslint's no-restricted-imports)
e2e/              Detox config (Android)
docs/             Docusaurus site
.storybook/       Storybook config (web build only, see above)
```

## Full local pipeline

To reproduce everything CI runs, end to end:

```bash
pnpm install
pnpm lint && pnpm typecheck && pnpm test:unit
(cd docs && pnpm build)
pnpm build-storybook --config-dir .storybook --output-dir storybook-static
```

## Where to find the "why"

This README is deliberately just the how-to. For the reasoning behind specific
decisions — why `nodeLinker: hoisted`, why Storybook only builds for web so far,
what's intentionally left unfinished and why — see
[`_bmad-output/implementation-artifacts/spec-1-1-project-skeleton-ci-cd.md`](_bmad-output/implementation-artifacts/spec-1-1-project-skeleton-ci-cd.md)
(its Spec Change Log walks through every bug found and fixed while building this
skeleton) and
[`_bmad-output/implementation-artifacts/deferred-work.md`](_bmad-output/implementation-artifacts/deferred-work.md)
(known gaps that are deliberate, not forgotten).
