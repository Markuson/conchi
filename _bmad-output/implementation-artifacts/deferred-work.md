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
  summary: RESOLVED (branch `fix/android-expo-gradle-wiring`) — deploy-app.yml's Android release build previously failed in real CI: "Android Gradle Plugin: project ':expo' does not specify `compileSdk` in build.gradle (node_modules/expo/android/build.gradle)"
  evidence: |
    Root cause: `android/` was scaffolded by the plain React Native CLI, not Expo's own tooling. `expo`, `expo-modules-core`, and `expo-secure-store` were then added as JS dependencies only — nothing wires up the Android-side "Expo Modules" Gradle plugin. `node_modules/expo/android/build.gradle` does `apply plugin: 'expo-module-gradle-plugin'` and `apply plugin: "expo-autolinking"`, but those plugins were never registered anywhere in `android/settings.gradle` (which only did `includeBuild("../node_modules/@react-native/gradle-plugin")` for React Native's own plugin — nothing equivalent for Expo's, found in `node_modules/expo-modules-autolinking/android/expo-gradle-plugin`). Without that registration, `expo-module-gradle-plugin`'s default-config injection (which is what would set `compileSdk` etc.) never ran, so Gradle failed evaluating the `:expo` project.
    This was flagged as an unverified risk during Story 1.1's implementation but never resolved or even logged here — the sandbox used for all of Story 1.1's verification had no Android SDK, so the Gradle build could never actually be run far enough to hit this. It surfaced for real only once the PR merged and `deploy-app.yml` ran on GitHub's runners.

    Fix, done against a real Android SDK/emulator (not the recommended `npx expo prebuild`, which turned out not to be viable — see below): added the missing `useExpoModules()` wiring to `android/settings.gradle`, then hit and fixed four further AGP-9/Gradle-9.4.1-vs-Expo-SDK-57 incompatibilities one at a time, verified against a real `installDebug` build:
    - Expo's own `install-expo-modules` bootstrap CLI (the tool that would normally do the `settings.gradle` wiring) doesn't yet support this RN 0.87 / Expo SDK 57 combination — it errored on every invocation. Wired `settings.gradle` by hand instead, based on reading `expo-modules-autolinking`'s actual Gradle plugin source.
    - `expo-modules-autolinking`'s and `expo-modules-core`'s internal Gradle plugins don't pin a Kotlin compiler version, so they inherited Gradle 9.4.1's bundled Kotlin (2.3.0) and failed to compile against it. Fixed via `pnpm patch` pinning `kotlin("jvm") version "2.3.0"` in both packages' plugin build scripts — the same pattern Expo's own maintainers used for this bug class in [expo/expo#37274](https://github.com/expo/expo/pull/37274).
    - AGP 9 removed `targetSdk` from library modules' `defaultConfig` (app/test-only now); `expo-module-gradle-plugin` still set it. Patched to skip it (same `pnpm patch`).
    - AGP 9 removed the `android.defaults.buildfeatures.buildconfig` gradle.properties default (setting it now hard-fails); `expo-log-box` needs it for a custom `buildConfigField`. Patched `expo-module-gradle-plugin` to set `buildFeatures.buildConfig = true` directly via the AGP DSL instead of relying on the removed global flag.
    - AGP 9 forbids lazy `Provider` instances in the legacy SourceSet API by default; `expo-log-box`'s bundled build.gradle still uses one. Added the AGP-documented escape hatch `android.sourceset.disallowProvider=false` to `android/gradle.properties`.
    - A fifth issue only surfaced once Gradle configuration succeeded and the native build actually ran: `expo-modules-core`'s CMake build failed compiling `EventEmitter.cpp` with `fatal error: 'jserrorhandler/ErrorUtils.h' file not found`. Root cause is an upstream react-native 0.87 packaging gap — `ReactAndroid/build.gradle.kts`'s `preparePrefab` task never copies `ReactCommon/jserrorhandler/` into the `reactnative` prefab module's headers, yet the prefab's own bundled `cxxreact/ErrorUtils.h` `#include`s `<jserrorhandler/ErrorUtils.h>`. The header does exist in the npm package's C++ source tree, just not on `expo-modules-core`'s include path. Patched `expo-modules-core/android/cmake/main.cmake` (same `pnpm patch`) to add `${REACT_NATIVE_DIR}/ReactCommon` as an include directory.

    All `node_modules` edits are captured via `pnpm patch` (`pnpm-workspace.yaml`'s `patchedDependencies` + `patches/*.patch`), so they survive a fresh `pnpm install` rather than being silently lost. Verified end-to-end: `pnpm android` now successfully builds, installs, and launches the app on a real device/emulator.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-self-hosting-infrastructure.md`
  summary: root README.md has no mention of or link to self-hosting/README.md, so a reader of the main project README has no way to discover the self-hosting folder exists
  evidence: found during story 1.2's code review (blind-hunter layer); same discoverability class as the intro.md pointer above — bundling both into one small follow-up doc pass makes more sense than a one-line patch mid-review

- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-self-hosting-infrastructure.md`
  summary: self-hosting/README.md only documents wiring n8n's S3 node with MinIO's root credentials — no documented path to create a dedicated, bucket-scoped MinIO user for least-privilege access
  evidence: found during story 1.2's code review (blind-hunter layer); real hardening improvement but not required by this story's AC (root-credential wiring satisfies AD-6), and the exact `mc admin user`/policy-attach commands need their own live-verification pass rather than being added unverified during a review loopback

- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-self-hosting-infrastructure.md`
  summary: self-hosting/README.md has no guidance on monitoring minio-data disk usage or a retention/cleanup policy for old uploads, on a host that also runs Postgres and n8n
  evidence: found during story 1.2's code review (blind-hunter layer); operational concern that matters once real upload volume exists, not blocking this story's infrastructure-standup goal

- source_spec: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-08-27.md`
  summary: app-uploaded file storage reverted from MinIO to Google Drive (reusing the existing n8n Drive node); the `self-hosting/` MinIO compose/docs from Story 1.2 were removed 2026-08-28 as unused, rather than kept dormant
  evidence: the OAuth-complexity rationale for avoiding Drive didn't hold once uploads were confirmed to always proxy through n8n with an already-authenticated Drive credential; MinIO's public-read requirement needs a Tailscale/Cloudflare tunnel not yet built. Portfolio-signal value of self-hosting was the only remaining reason for MinIO — Marc chose ops simplicity instead, then decided the dormant infra folder wasn't worth keeping around either. Migrating to a self-hosted store is a possible future improvement, to be rebuilt from scratch if revisited.
