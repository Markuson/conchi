---
title: 'Story 1.1 — Project Skeleton & CI/CD'
type: 'chore'
created: '2026-08-25'
status: 'done'
review_loop_iteration: 1
baseline_commit: b65198d8a1083388ab1bb80f0a23d47ba9a5767f
context:
  - _bmad-output/implementation-artifacts/epic-1-context.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The repository has no runnable React Native app — only planning artifacts. Every subsequent feature story depends on a shared tooling foundation that does not yet exist.

**Approach:** Initialize a bare React Native 0.87.x project (New Architecture, Bridgeless mode) with pnpm, wire TypeScript strict + ESLint via Husky pre-commit, scaffold React Navigation with a typed ROUTES constant, set up Zustand store aggregator, configure Detox, create three GitHub Actions workflows, scaffold Docusaurus + Storybook, and commit the complete TypeScript type definitions — establishing all quality gates before any feature code lands.

## Boundaries & Constraints

**Always:**
- `pnpm` is the sole package manager — no `npm` or `yarn` in any script, CI workflow step, or Makefile
- TypeScript strict mode globally (`strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, full strict suite); no `any`; enforced by Husky pre-commit (lint + typecheck must both pass)
- ESLint ruleset: `@typescript-eslint/recommended-type-checked` + `eslint-plugin-react-native` + `eslint-plugin-react-hooks`; import rule blocking `components/` → `features/` or `store/`
- All route names live in the typed `ROUTES` constant (`src/navigation/routes.ts`); no string literals used as route names anywhere
- `store/index.ts` aggregates and re-exports feature slices only — no state, no selectors, no business logic of its own
- `userId: string` required field in `Entry` type — compiler enforces at every callsite
- All CI credentials (Android signing keystore, Firebase service account, FCM server key) sourced from GitHub Secrets only; no values in committed files
- Animations disabled in Detox builds via `process.env.DETOX_TEST` environment flag — one place, not scattered in components

**Ask First:**
- Android package name / bundle ID (needed for `react-native init`)
- Firebase App Distribution app ID + project ID (needed for `deploy-app.yml`)
- GitHub repository name + owner (needed for Docusaurus `url` / `baseUrl` config)

**Never:**
- Expo managed workflow or EAS Build — bare React Native only
- APK attached to GitHub Releases
- Real VPS URLs, tokens, or credentials in any committed file
- iOS CI build (deferred to V1.1)
- Idioma language toggle (deferred to V1.1)

</frozen-after-approval>

## Code Map

All files are new — no existing app source to reuse.

- `package.json` — pnpm workspace root; scripts: `start`, `android`, `ios`, `lint`, `typecheck`, `test:unit`, `test:e2e`, `storybook`
- `tsconfig.json` — strict TypeScript config
- `.eslintrc.js` — three-plugin ESLint config + `no-restricted-imports` boundary rule
- `.husky/pre-commit` — runs `pnpm lint && pnpm typecheck`
- `src/navigation/routes.ts` — typed `ROUTES` const (`as const`) with keys: `Home`, `Analytics`, `Main`, `Settings`; exports `TabParamList` (`{Home: undefined; Analytics: undefined}`) and `StackParamList` (`{Main: undefined; Settings: undefined}`) as separate types
- `src/navigation/index.tsx` — `createBottomTabNavigator<TabParamList>` (Home + Analytics); `createNativeStackNavigator<StackParamList>` wrapping tabs under `ROUTES.Main`; Settings as `ROUTES.Settings` stack screen
- `src/lib/types/entry.ts` — `Entry` shape: `{ id, userId, amount, currency, category, subcategory, description, date, context?, fileUrl?, origin: 'app' }`
- `src/lib/types/analytics.ts` — exact shapes: `AnalyticsFilterParams: { from: string; to: string; category?: string; subcategory?: string; context?: string }` · `AnalyticsTotals: Array<{ label: string; value: number }>` (array type alias, not interface) · `AnalyticsResponse: { totals: AnalyticsTotals; entries: Entry[] }`
- `src/lib/types/index.ts` — barrel re-export of all types
- `src/lib/storage/mmkv.ts` — typed MMKV instance wrapper
- `src/lib/storage/secureStore.ts` — `expo-secure-store` wrapper (read/write/delete)
- `src/lib/constants.ts` — `IS_DETOX = !!process.env.DETOX_TEST` and any other cross-story compile-time constants
- `src/store/referenceData.ts` — shared Zustand slice (categories/subcategories/contexts); stubbed empty arrays; `features/settings` is sole writer
- `src/features/settings/settingsStore.ts` — placeholder Zustand slice: `webhookUrl`, `theme`
- `src/store/index.ts` — aggregates: re-exports `useSettingsStore`, `useReferenceDataStore`
- `src/screens/HomeScreen.tsx`, `AnalyticsScreen.tsx`, `SettingsScreen.tsx` — placeholder screens; import `SafeAreaView` from `react-native-safe-area-context` (not from `react-native` — deprecated)
- `src/App.tsx` — root: `NavigationContainer` wrapping root navigator
- `e2e/detox.config.js` — Detox config targeting Android emulator; sets `DETOX_TEST=true` in test environment
- `.github/workflows/pr-gate.yml` — lint + typecheck + unit tests; required status check before merge
- `.github/workflows/deploy-app.yml` — Android APK build → Firebase App Distribution (invite-only, Marc's email); APK not uploaded to Releases
- `.github/workflows/deploy-docs.yml` — Docusaurus build (`pnpm build` in `docs/`) + Storybook web build (`pnpm build-storybook --config-dir .storybook --output-dir storybook-static`) → combined artifact deployed to GitHub Pages; Storybook goes under `/storybook/` subpath
- `docs/` — Docusaurus scaffold: `docusaurus.config.js`, `sidebars.js`, placeholder `docs/intro.md`
- `.storybook/main.cjs` — Storybook config in CommonJS format (`module.exports`, not `export default`; `.cjs` extension required for ESM-agnostic loading)

## Tasks & Acceptance

**Execution:**
- [x] `package.json` + `pnpm-lock.yaml` — bare RN 0.87.x, pnpm; set `packageManager: pnpm@11.9.0`; omit `@types/react-native` (RN 0.87 ships own types); verify Expo bare packages compatible before pinning
- [x] `tsconfig.json` — full strict suite; `moduleResolution: bundler`, `module: ESNext`
- [x] `.eslintrc.js` — three-plugin ruleset; `no-restricted-imports` applies globally but override extends to `src/screens/**` and `src/lib/**` (in addition to `src/features/**` and `src/store/**`) so only `src/components/**` is blocked from importing features/store
- [x] `.husky/pre-commit` — `pnpm lint && pnpm typecheck`
- [x] `src/lib/constants.ts` — `IS_DETOX = !!process.env['DETOX_TEST']`
- [x] `src/lib/types/entry.ts` — Entry shape exactly as in Code Map; `userId: string` required
- [x] `src/lib/types/analytics.ts` — exact shapes per Code Map: `AnalyticsFilterParams` with `from`/`to`/`context?`; `AnalyticsTotals` as array type alias; `AnalyticsResponse` with `entries: Entry[]`
- [x] `src/lib/types/index.ts` — barrel re-export
- [x] `src/lib/storage/mmkv.ts`, `secureStore.ts` — typed wrappers; no business logic
- [x] `src/navigation/routes.ts` — `ROUTES` with `Home`, `Analytics`, `Main`, `Settings`; export `TabParamList` and `StackParamList` as separate types
- [x] `src/navigation/index.tsx` — `createBottomTabNavigator<TabParamList>` (Home+Analytics); `createNativeStackNavigator<StackParamList>` with `ROUTES.Main`→MainTabs and `ROUTES.Settings`→SettingsScreen
- [x] `src/store/referenceData.ts` — stubbed Zustand slice (empty arrays)
- [x] `src/features/settings/settingsStore.ts` — placeholder slice (`webhookUrl: ''`, `theme: 'system'`)
- [x] `src/store/index.ts` — aggregate re-exports only
- [x] `src/screens/HomeScreen.tsx`, `AnalyticsScreen.tsx`, `SettingsScreen.tsx` — placeholder screens using `SafeAreaView` from `react-native-safe-area-context`
- [x] `src/App.tsx` — root component with NavigationContainer
- [x] `e2e/detox.config.js` — Detox for Android emulator; `testEnvironment: { DETOX_TEST: 'true' }`
- [x] `e2e/jest.config.js` — Jest config for Detox E2E tests (referenced by detox.config.js)
- [x] `.github/workflows/pr-gate.yml` — lint + typecheck + unit; pnpm `version: '11'` in `pnpm/action-setup`
- [x] `.github/workflows/deploy-app.yml` — Android APK → Firebase App Distribution; pnpm `version: '11'`; add cleanup step after Gradle build: `rm -f android/app/release.keystore android/app/google-services.json`
- [x] `.github/workflows/deploy-docs.yml` — pnpm `version: '11'`; build Docusaurus (`pnpm build` in `docs/`); build Storybook (`pnpm build-storybook --config-dir .storybook --output-dir storybook-static`); copy `storybook-static/` into `docs/build/storybook/`; upload `docs/build/` to Pages
- [x] `docs/` — Docusaurus scaffold with placeholder page; `docs/package.json` with build script
- [x] `.storybook/main.cjs` — CommonJS config (`module.exports`); `build-storybook` script in root `package.json`

**Acceptance Criteria:**
- Given `pnpm install` is run, when it completes, then all dependencies install cleanly and no `npm` or `yarn` commands appear in any script, CI workflow step, or Makefile
- Given a TypeScript file containing `any`, when the Husky pre-commit hook fires, then the typecheck step fails and the commit is blocked
- Given any staged commit, when the pre-commit hook runs, then both lint and typecheck execute; the commit is blocked if either fails
- Given a pull request is opened, when `pr-gate.yml` runs, then lint + typecheck + unit tests all pass before merge is permitted
- Given a merge to main, when `deploy-app.yml` runs, then an Android APK is built and delivered to Marc's Firebase App Distribution invite-only group; the APK is never attached to a GitHub Release
- Given a merge to main, when `deploy-docs.yml` runs, then Docusaurus and Storybook deploy to GitHub Pages without error
- Given any screen or feature referencing a route, when code compiles, then it imports from `ROUTES`; no string literals are used as route names
- Given `store/index.ts`, when imported, then it only re-exports feature slices — no state, no business logic, no selectors
- Given `Entry` anywhere in the codebase, when TypeScript compiles, then `userId: string` is present and required at every callsite with no `@ts-ignore` or `as any` workarounds
- Given `lib/types/analytics.ts`, when imported, then `AnalyticsFilterParams`, `AnalyticsTotals`, and `AnalyticsResponse` are exported with the correct shapes defined in the epic context

## Spec Change Log

### Loop 1 (2026-08-26)

**Triggering findings (bad_spec):**
1. Analytics types deviated from the contract defined in epic context. `AnalyticsFilterParams` had `{userId, startDate, endDate}` instead of `{from, to}`. `AnalyticsTotals` was an interface object instead of `Array<{label,value}>`. `AnalyticsResponse.entries` was `string[]` instead of `Entry[]`.
2. Navigation naming collision: `ROUTES.Home` used as both the Stack wrapper screen name and the Tab screen name. TypeScript compiled but navigator would misbehave at runtime.
3. Storybook never built: `deploy-docs.yml` ran `--smoke-test || true` which produces no output; Pages received no Storybook artifact.

**What was amended:**
- Analytics types field names and shapes made explicit in Code Map and Design Notes (previously only in epic context AC).
- Navigation design note added specifying `ROUTES.Main` as the Stack wrapper name distinct from `ROUTES.Home` (the Tab screen), with separate `TabParamList` and `StackParamList`.
- Storybook build command in deploy-docs.yml task changed to `pnpm build-storybook --config-dir .storybook --output-dir storybook-static`.
- pnpm version in CI changed from `9` to `11` (match `packageManager` field major version).
- `SafeAreaView` import source changed to `react-native-safe-area-context` in all screens (user-confirmed deprecation).
- `no-restricted-imports` override extended to cover `src/screens/**` and `src/lib/**` (screens legitimately import from features/ and store/).
- `@types/react-native` removed from devDependencies (RN 0.87 ships its own types via `@react-native/types`).
- CI cleanup steps added for `release.keystore` and `google-services.json` after APK build.
- `.storybook/main.js` renamed to `.storybook/main.cjs` and must use `module.exports` not `export default`.
- `e2e/jest.config.js` added to task list.

**Known-bad state avoided:** analytics type mismatch would compile silently but break all analytics consumers; navigation collision causes runtime navigation failures; missing Storybook build means Pages deploy has no Storybook content ever.

**KEEP (what worked well and must survive re-derivation):**
- Entry type shape is correct — keep exactly as written.
- MMKV wrapper and secureStore wrapper implementations are solid.
- Store boundary (index.ts re-exports only) is correctly implemented.
- Husky pre-commit hook pattern is correct.
- pr-gate.yml structure is correct (except pnpm version).
- deploy-app.yml keystore/google-services decode approach is correct (add cleanup only).
- Detox config structure and testEnvironment approach is correct.

### Loop 2 (2026-08-26)

**Classification:** patch (all findings below were config-only fixes applied directly to the working tree; no revert/re-implementation loopback was needed, `review_loop_iteration` remains 1).

**Findings and fixes:**
1. `pr-gate.yml` ran `pnpm test:unit -- --ci`. Because pnpm forwards to `jest -- --ci`, yargs' `--` "end of options" marker made jest treat `--ci` as a literal positional testPathPattern (matching zero files) instead of a flag, so the unit-test CI step silently reported "no tests found" as a failure. Reproduced directly (`pnpm test:unit -- --ci` vs `pnpm test:unit --ci`). **Fixed:** changed to `pnpm test:unit --ci` (no `--`).
2. Critical: `android/settings.gradle`'s `includeBuild("../node_modules/@react-native/gradle-plugin")` failed under pnpm's default symlinked/virtual-store `node_modules` layout, because `@react-native/gradle-plugin` is a transitive dependency (declared only inside `react-native`'s own `package.json`) and pnpm's strict layout never places transitive packages at the top-level `node_modules/@react-native/`. Reproduced via `cd android && ./gradlew help --offline` → `Included build '.../node_modules/@react-native/gradle-plugin' does not exist.` `public-hoist-pattern` entries in `.npmrc` did not fix it (confirmed empirically — hoist patterns don't apply to build-time `includeBuild` resolution the same way). **Fixed:** added `nodeLinker: hoisted` to `pnpm-workspace.yaml` (pnpm v11 reads workspace-level linker config from `pnpm-workspace.yaml`, not `.npmrc`) and deleted `.npmrc`. This switches the whole workspace to npm/yarn-classic-style flat hoisting, so `@react-native/gradle-plugin` and all other transitive RN packages land at top-level `node_modules/@react-native/*`. Verified the Gradle "included build does not exist" error is gone (build now progresses to a sandbox-only JDK-version limitation — this sandbox has no JDK 17, but real CI installs it via `actions/setup-java@v4` before the Gradle step, so this is not a pipeline defect).
3. Regression introduced by fix #2: switching to `nodeLinker: hoisted` left `docs/node_modules` in a stale state — its `@docusaurus/*` entries were symlinks into the old (now-gone) `.pnpm` virtual-store paths from before the linker switch, since only the root `node_modules` had been removed and reinstalled. `cd docs && pnpm build` failed with `Cannot find module '.../docs/node_modules/@docusaurus/core/bin/docusaurus.mjs'`, and root `pnpm build-storybook` failed with pnpm misreading it as an unrecognized recursive command. **Fixed:** `rm -rf docs/node_modules && pnpm install` from the workspace root, which under the hoisted linker no longer creates a separate `docs/node_modules` at all — `docs/build` and root `build-storybook` both resolve `@docusaurus/*`/`storybook` via the hoisted root `node_modules` through Node's directory-walking module resolution. Re-verified: `pnpm typecheck` (0 errors), `pnpm lint` (0 errors), `pnpm test:unit --ci` (2/2 pass), `cd docs && pnpm build` (succeeds), `pnpm build-storybook --config-dir .storybook --output-dir <tmp>` (succeeds).

**Known-bad state avoided:** silently-broken unit-test CI gate (finding 1); Android release build completely broken for every contributor using pnpm's default layout, not just a sandbox quirk (finding 2); Docusaurus/Storybook Pages deploy broken as a direct side effect of fixing finding 2, which would have gone unnoticed without re-running the full pipeline after the hoisting change (finding 3).

**KEEP:** the `nodeLinker: hoisted` workspace setting is now load-bearing for the Android build — do not revert it without re-solving the `includeBuild` resolution problem another way.
- IS_DETOX constant in lib/constants.ts is correct.
- RootStackParamList typed navigator pattern is correct — just needs separate Tab and Stack param lists.

### Loop 2, review pass 2 (2026-08-26)

Full three-layer review (blind-hunter, edge-case-hunter, verification-gap) re-run against the diff since `baseline_commit` after Loop 2's self-fixes. All surviving findings were mechanical/isolated (no design-level root cause touching `<frozen-after-approval>` or requiring re-derivation), so `review_loop_iteration` stays at 1 — no revert/loopback triggered. One blind-hunter finding (claimed `MainActivity.kt`/`MainApplication.kt` were missing) was a false positive caused by the reviewer diff being filtered to exclude RN-CLI-boilerplate paths for size — grep-verified both files exist; rejected.

**Classification: patch (applied directly)**
1. `android/app/src/main/AndroidManifest.xml` references the `${usesCleartextTraffic}` manifest placeholder but `android/app/build.gradle` never defined it — would break every Gradle build (debug and release), confirmed via `manifestPlaceholders` grep returning nothing. **Fixed:** added `manifestPlaceholders = [usesCleartextTraffic: "false"]` to `defaultConfig`. Re-verified `cd android && ./gradlew help --offline` now progresses past manifest resolution (fails only on missing local Android SDK, a sandbox-only gap — GitHub's `ubuntu-latest` runners ship one preinstalled).
2. `deploy-app.yml`'s Firebase service-account cleanup (`rm -f /tmp/firebase-service-account.json`) lived in the same `run:` block as the `firebase-tools distribute` call, so a failed distribute skipped it — unlike the keystore/google-services.json cleanup, which correctly runs as a separate `if: always()` step. **Fixed:** moved the temp-file cleanup into the existing `if: always()` step.
3. Cross-confirmed by blind-hunter and independently, rigorously, by verification-gap with a concrete regression demonstration: `pr-gate.yml` never built docs or Storybook, so a PR that breaks `docs/docusaurus.config.js` or `.storybook/main.cjs` would still pass every required check and only fail post-merge in `deploy-docs.yml` — reproducing the exact failure class Loop 1 already caught once (silently-broken Storybook build). **Fixed:** added "Build Docusaurus", "Build Storybook", and "Verify Storybook output is non-empty" steps to `pr-gate.yml`, mirroring `deploy-docs.yml`'s build steps.
4. Same empty-Storybook-output risk exists in `deploy-docs.yml` itself as defense-in-depth. **Fixed:** added a `test -n "$(ls -A storybook-static)"` check before the merge-into-docs step.
5. `.storybook/main.cjs`'s header comment claimed the config "drives both" on-device and web Storybook, but only the web framework is configured — misleading. **Fixed:** reworded to state on-device Storybook isn't wired up yet and what it would need.
6. `docs/docs/intro.md` described the backend as "n8n + PostgreSQL + MinIO" — MinIO never existed in the actual infra (the now-deleted `docs/brief.md` documents Google Drive as the file store); apparent hallucination during scaffolding. **Fixed:** corrected to "n8n + PostgreSQL + Google Drive".
7. `pnpm-workspace.yaml`'s `allowBuilds` list had no comment explaining why each package's install scripts are pre-approved. **Fixed:** added one.
8. `.husky/pre-commit` was committed executable but had no shebang. **Fixed:** added `#!/usr/bin/env sh`.
9. `sprint-status.yaml`'s `last_updated` had dropped the `HH:MM` suffix that its sibling `generated` field keeps. **Fixed:** restored the full timestamp format.
10. `src/lib/constants.ts`'s `IS_DETOX = !!process.env['DETOX_TEST']` would evaluate `true` for any non-empty value, not just `'true'`. **Fixed:** `=== 'true'` strict comparison.

Re-verified after all patches: `pnpm typecheck` (0 errors), `pnpm lint` (0 errors), `pnpm test:unit --ci` (2/2 pass), `cd docs && pnpm build` (succeeds), `pnpm build-storybook --config-dir .storybook --output-dir <tmp>` (succeeds, non-empty check passes), `cd android && ./gradlew help --offline` (progresses past manifest + includeBuild resolution).

**Classification: defer (appended to `deferred-work.md`)**
- `deploy-app.yml` decodes `google-services.json` but no `google-services` Gradle plugin is applied anywhere — currently inert, harmless (always cleaned up), forward-provisioning for a Firebase SDK integration that hasn't landed yet.
- Detox e2e scaffolding isn't wired into any CI workflow — correctly so, since no `e2e/*.test.ts` files exist yet to run.
- `tsconfig.json`'s `noUncheckedIndexedAccess: false` is a narrower reading of "full strict suite" than TypeScript's extended strict family offers; flipping it now would ripple into stub array code with no current payoff.
- `IS_DETOX` has zero consumers because `react-native-reanimated` isn't a dependency yet and no screen animates; whichever story adds an animation library must consume it per the frozen "animations disabled in Detox builds" boundary.

**Classification: reject (dropped silently)**
- Claimed-missing `MainActivity.kt`/`MainApplication.kt` (false positive, files exist).
- No pre-flight validation that CI secrets are non-empty before use (fails loudly downstream anyway; a solo-dev misconfiguration caught immediately in the Actions log).
- Inconsistent `permissions:` blocks across the three workflows (hardening nice-to-have, not a functional defect, not spec'd).
- `no-restricted-imports` override not extended to `src/navigation/**` (no current file there imports features/store — speculative).
- `@types/node` major version vs. `engines.node` minimum mismatch (normal in the Node ecosystem; no code touches a Node-26-only API).
- `referenceData.ts`'s `setReferenceData` allowing an explicit-`undefined` overwrite via spread (zero current callers — stub for Epic 2).
- `mmkv.ts` not catching a native-module-init throw (intentional fail-fast; trust the environment guarantee rather than swallow a real misconfiguration).
- `docs/brief.md` deletion and its content not being carried into `docs/docs/intro.md` (this deletion predates Story 1.1's own changes — inherited pre-existing state, not this story's decision to second-guess).
- `nodeLinker: hoisted` trade-off not documented in the frozen "Always" boundaries (already documented in this file's own Spec Change Log, which is the correct non-frozen location for it).

## Design Notes

**ROUTES constant + navigation pattern:**
```ts
// routes.ts
export const ROUTES = {
  Home: 'Home',
  Analytics: 'Analytics',
  Main: 'Main',      // stack-level wrapper for tab navigator
  Settings: 'Settings',
} as const;
export type TabParamList = { [ROUTES.Home]: undefined; [ROUTES.Analytics]: undefined };
export type StackParamList = { [ROUTES.Main]: undefined; [ROUTES.Settings]: undefined };

// index.tsx
const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<StackParamList>();
function MainTabs() { /* Tab.Screen Home + Analytics */ }
export function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name={ROUTES.Main} component={MainTabs} options={{headerShown:false}} />
      <Stack.Screen name={ROUTES.Settings} component={SettingsScreen} />
    </Stack.Navigator>
  );
}
```
`ROUTES.Main` ≠ `ROUTES.Home` — no naming collision between stack and tab layers.

**Detox animation disable — single source:**
`src/lib/constants.ts` exports `IS_DETOX`. Reanimated config file reads this flag and sets `disableAnimations`. No per-component conditionals.

**Store boundary enforcement:**
The ESLint `no-restricted-imports` rule on `src/components/**` prevents importing from `src/features/**` or `src/store/**` — the compiler enforces AD-2, not code review.

## Verification

**Commands:**
- `pnpm install` — expected: exits 0, no npm/yarn references in output
- `pnpm typecheck` — expected: zero errors
- `pnpm lint` — expected: zero errors
- `pnpm test:unit` — expected: passes (placeholder suite)
- `grep -r "npm \|yarn " .github/ scripts/` — expected: no matches

**Manual checks:**
- Open `store/index.ts` — confirm it contains only import + re-export statements, no `create()`
- Open any placeholder screen — confirm it imports route name from `ROUTES`, not a string literal
- Open `lib/types/entry.ts` — confirm `userId: string` (no `?`, no default)

## Suggested Review Order

**Typed navigation (the design decision Loop 1 caught and fixed)**

- Entry point — `ROUTES.Main` is a distinct Stack-level name from `ROUTES.Home` the Tab screen, resolving Loop 1's naming collision.
  [`routes.ts:9`](../../src/navigation/routes.ts#L9)

- Separate `TabParamList`/`StackParamList` types, not one shared param list, so each navigator's screen names are independently checked.
  [`routes.ts:16`](../../src/navigation/routes.ts#L16)

- Stack wraps the tab navigator under `ROUTES.Main`; Settings sits alongside as a sibling stack screen.
  [`index.tsx:25`](../../src/navigation/index.tsx#L25)

- Regression test pins the fix: asserts `ROUTES.Main !== ROUTES.Home`.
  [`routes.test.ts:3`](../../__tests__/routes.test.ts#L3)

**Type contracts (Loop 1's other design-level fix)**

- `AnalyticsTotals` is an array type alias, not an interface — matches the epic-context contract exactly.
  [`analytics.ts:21`](../../src/lib/types/analytics.ts#L21)

- `AnalyticsResponse.entries` is `Entry[]`, not `string[]`.
  [`analytics.ts:27`](../../src/lib/types/analytics.ts#L27)

- `userId: string` is required, not optional — compiler enforces at every callsite.
  [`entry.ts:9`](../../src/lib/types/entry.ts#L9)

**State boundary enforcement**

- `store/index.ts` re-exports only — no `create()`, no business logic of its own.
  [`store/index.ts:5`](../../src/store/index.ts#L5)

- `no-restricted-imports` blocks `src/components/**` from reaching `features/`/`store/` at compile time, not by convention.
  [`.eslintrc.js:47`](../../.eslintrc.js#L47)

**pnpm layout fix (Loop 2's critical, cross-cutting bug)**

- `nodeLinker: hoisted` — the fix for `@react-native/gradle-plugin` never resolving under pnpm's default symlinked layout; load-bearing for every Android build.
  [`pnpm-workspace.yaml:4`](../../pnpm-workspace.yaml#L4)

- `manifestPlaceholders` for `usesCleartextTraffic` — a second, independent Android build blocker found in this story's own review pass and fixed the same way (mechanical, isolated).
  [`build.gradle:89`](../../android/app/build.gradle#L89)

**CI/CD gates**

- `pr-gate.yml` now builds Docusaurus + Storybook pre-merge, closing the gap that let Loop 1's silently-broken Storybook build ship once already.
  [`pr-gate.yml:42`](../../.github/workflows/pr-gate.yml#L42)

- Firebase service-account temp file now cleaned up in the same `if: always()` step as the keystore, not inline after a call that can fail first.
  [`deploy-app.yml:74`](../../.github/workflows/deploy-app.yml#L74)

**Peripherals**

- `IS_DETOX` uses a strict `=== 'true'` comparison, not `!!`, so only the literal value Detox sets it to counts.
  [`constants.ts:8`](../../src/lib/constants.ts#L8)

- Storybook config comment corrected to state on-device Storybook isn't wired up yet, avoiding an overclaim.
  [`main.cjs:8`](../../.storybook/main.cjs#L8)
