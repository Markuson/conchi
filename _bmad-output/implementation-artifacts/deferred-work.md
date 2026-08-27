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

- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-design-system-foundation.md`
  summary: on-device Storybook (`@storybook/react-native`) entry point not added — `.storybook/main.cjs` still only drives the web build; addons aren't split on `process.env.STORYBOOK_WEB`
  evidence: `.storybook/main.cjs`'s own comment (left by Story 1.1) suggests Story 1.3 add this, and no AC for Story 1.3 requires it — `pnpm storybook` (web) satisfies the Button-story AC on its own. Carved out during spec planning to bring spec-1-3 back under the ~1600-token scope budget; needs its own bootstrap file (`getStorybookUI()` + generated `storybook.requires`) and device/emulator verification — a clean, independently shippable follow-up once there's a real reason to browse components on-device.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-design-system-foundation.md`
  summary: no CI check actually mounts/renders a Storybook story — `pnpm build-storybook` only bundles the preview code and confirms `storybook-static` is non-empty, it never executes the bundled decorators/components in a browser
  evidence: found by the story's own verification-gap review. This means a future regression in either the `.storybook/main.cjs` React-19 `react-dom-shim` alias (see AD-6-adjacent note in that file) or the `.storybook/preview.cjs` `ThemeProvider` decorator would ship past CI undetected — both were only caught this time by a one-time manual headless-browser check run during this story's implementation, not by anything repeatable. Recommend wiring a headless story-runner (e.g. `@storybook/test-runner` + Playwright) into `.github/workflows/pr-gate.yml`'s `build-storybook` step, asserting at least one story per component mounts without a console error.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-design-system-foundation.md`
  summary: native font linking (`react-native.config.js` + the Android/iOS asset registration) has no CI verification, since no workflow builds the native Android or iOS app
  evidence: pre-existing gap, same class as the already-logged Android Gradle `compileSdk` KNOWN BROKEN entry above (Story 1.1) — not caused by this story, but this story is the first to depend on native font linking actually working, and nothing in CI would catch a broken link. Worth closing once/if a native build step is added to CI.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-design-system-foundation.md`
  summary: `ios/Conchi.xcodeproj/project.pbxproj`'s new font `PBXFileReference` entries carry `fileEncoding = undefined;`, `explicitFileType = undefined;`, `lastKnownFileType = unknown;` — `react-native-asset`'s standard auto-generated output for arbitrary binary resources, but unconfirmed against a real Xcode build in this sandbox (no macOS/Xcode available)
  evidence: found by the story's own blind-hunter review. These sentinel values are expected from the tool used and shouldn't block Xcode's Copy Bundle Resources build phase (which is driven by the PBXResourcesBuildPhase file list, not these type-hint fields), but should be confirmed the next time this project is opened on a real Mac — matches this project's existing pattern of deferring native-build verification the sandbox can't perform.
