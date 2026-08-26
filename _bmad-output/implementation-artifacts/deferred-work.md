- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-project-skeleton-ci-cd.md`
  summary: settingsStore webhookUrl and theme are in-memory only and lost on app restart — persistence is Story 1.5's job
  evidence: story 1.5 owns MMKV/secureStore write for connection config; skeleton slice is intentionally stateless

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-project-skeleton-ci-cd.md`
  summary: referenceData slice stores categories/subcategories as flat string arrays with no category→subcategory relationship
  evidence: the proper Category/Subcategory data shape is defined in Story 2.2; skeleton uses empty stub arrays

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-project-skeleton-ci-cd.md`
  summary: pre-commit hook does not run unit tests — only lint + typecheck
  evidence: unit tests are slow; running them on every commit is a deliberate trade-off; CI gate covers tests

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-project-skeleton-ci-cd.md`
  summary: no lint-staged configuration — pre-commit lints all of src/ rather than only staged files
  evidence: acceptable for a solo developer at V1; lint-staged is a workflow optimization not required by spec

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-project-skeleton-ci-cd.md`
  summary: deploy-app.yml decodes google-services.json from a GitHub Secret but no google-services Gradle plugin is applied anywhere, so the file currently has no consumer
  evidence: the decode+cleanup is harmless (file is always removed in the always()-guarded cleanup step) but is dead infrastructure until a later story actually wires the Firebase SDK into the Android app; apply com.google.gms.google-services then, or remove the decode step if it turns out unneeded

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-project-skeleton-ci-cd.md`
  summary: Detox e2e scaffolding (e2e/detox.config.js, e2e/jest.config.js) is not wired into any CI workflow
  evidence: no e2e/*.test.ts files exist yet to run — CI wiring is deferred until a later story adds actual e2e specs; wiring an empty test suite into CI now would be a no-op

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-project-skeleton-ci-cd.md`
  summary: tsconfig.json explicitly sets noUncheckedIndexedAccess to false, a narrower reading of "full strict suite" than TypeScript's extended strict family offers
  evidence: flipping it now would ripple into every array/record index across the codebase (analytics totals, referenceData arrays) with no immediate payoff since those arrays are still stub data; revisit once Epic 2's array-heavy analytics code lands and indexed-access safety actually matters

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-project-skeleton-ci-cd.md`
  summary: IS_DETOX (src/lib/constants.ts) has zero consumers — the frozen boundary "animations disabled in Detox builds" has nothing to wire into yet
  evidence: react-native-reanimated isn't a project dependency yet and no screen has animations; the story that adds an animation library must consume IS_DETOX in its config per this boundary

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-project-skeleton-ci-cd.md`
  summary: KNOWN BROKEN — deploy-app.yml's Android release build fails in real CI (confirmed on the merged PR's actual GitHub Actions run, not just a sandbox limitation): "Android Gradle Plugin: project ':expo' does not specify `compileSdk` in build.gradle (node_modules/expo/android/build.gradle)"
  evidence: |
    Root cause: `android/` was scaffolded by the plain React Native CLI, not Expo's own tooling. `expo`, `expo-modules-core`, and `expo-secure-store` were then added as JS dependencies only — nothing wires up the Android-side "Expo Modules" Gradle plugin. `node_modules/expo/android/build.gradle` does `apply plugin: 'expo-module-gradle-plugin'` and `apply plugin: "expo-autolinking"`, but those plugins are never registered anywhere in `android/settings.gradle` (which currently only does `includeBuild("../node_modules/@react-native/gradle-plugin")` for React Native's own plugin — nothing equivalent for Expo's, found in `node_modules/expo-modules-autolinking/android/expo-gradle-plugin`). Without that registration, `expo-module-gradle-plugin`'s default-config injection (which is what would set `compileSdk` etc.) never runs, so Gradle fails evaluating the `:expo` project.
    This was flagged as an unverified risk during Story 1.1's implementation but never resolved or even logged here — the sandbox used for all of Story 1.1's verification had no Android SDK, so the Gradle build could never actually be run far enough to hit this. It surfaced for real only once the PR merged and `deploy-app.yml` ran on GitHub's runners.
    Recommended fix: run `npx expo prebuild --platform android` (Expo's own official tool for exactly this class of problem — it regenerates `android/` with the correct native wiring for whatever Expo modules are installed, driven by `app.json`) on a machine with the Android SDK installed, review the diff against the current hand-scaffolded `android/` (custom `applicationId`, package name, signing config in `android/app/build.gradle` must survive the regen), then commit and push to verify against real CI. Exact Expo Gradle plugin IDs/syntax weren't hand-patched here because they've changed across Expo SDK versions and this project is on Expo 57 — a version past the point where guessing from memory is reliable; `expo prebuild` is the version-correct, testable way to get it right.
