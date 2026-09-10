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

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-app-shell-navigation.md`
  summary: RESOLVED — `ConchiBubble.tsx` now renders the real `conchi-idle.png` art (was a `react-native-svg` placeholder). Adding the Working/Error states + their ~200ms crossfade is still out of scope — nothing in the app triggers those states yet (needs the SSE/push plumbing from a later epic) — but `conchi-working.png`/`conchi-error.png` already exist in `src/assets/images/` ready to wire in when that lands.
  evidence: real assets provided by Marc this session, originally exported without a true alpha channel (a checkerboard "transparent area" indicator baked into the pixels instead of real transparency) — fixed via an automated color/connected-component analysis (grayscale checkerboard cells vs. genuine character colors, using each file's own natural size gap between small real-artwork regions and large background regions) rather than manual re-export. `hasAlpha` confirmed true post-fix. Not committed to this repo's tooling (no image-processing dependency added) — a one-off script run against the provided source files.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-app-shell-navigation.md`
  summary: RESOLVED — app icon replaced (was the default React Native template icon). `src/assets/images/app-icon-master.png` (Marc's source, same checkerboard-transparency issue as the bubble assets, plus the face was originally left in the background's near-white tone instead of the accent amber DESIGN.md/the bubble art uses) was cleaned the same way, recolored, and used to generate: Android legacy `mipmap-*/ic_launcher.png`/`ic_launcher_round.png`, a proper adaptive icon (`mipmap-anydpi-v26/ic_launcher.xml` + `ic_launcher_round.xml`, `@color/ic_launcher_background` = DESIGN.md's amber, `ic_launcher_foreground.png` per density), an Android 13+ `<monochrome>` themed-icon layer (`ic_launcher_monochrome.png` per density — needed for Nothing OS/Material You icon theming to show Conchi's silhouette instead of an auto-generated blob), and the iOS `AppIcon.appiconset` (all required sizes + `Contents.json` filenames).
  evidence: unconfirmed against a real Android Studio/Xcode build in this sandbox (no native tooling available) — matches this project's existing pattern of deferring native-build verification. Two known quality gaps worth revisiting with better source material: (1) one small residual light-gray artifact speck near the icon's top-right, from the same automated cleanup, not worth chasing further with the current source; (2) the iOS App Store marketing icon (`Icon-1024.png`) is upscaled 2x from the 512×512 master, so it's somewhat soft — fine for on-device icons (max ~180px) but a higher-resolution source (1024×1024+) would sharpen it if this ever ships to the App Store.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-app-shell-navigation.md`
  summary: Android's `elevation`-based shadow ignores the `shadowColor`/`shadowOpacity`/`shadowRadius` style props, so the FAB's and Conchi Bubble's DESIGN.md-specified amber/dark glow shadows will render as a plain default gray shadow on Android, while iOS renders the correct tinted shadow via those same props
  evidence: found by this story's edge-case-hunter and blind-hunter reviews, independently. Matching DESIGN.md's colored glow exactly on Android would require a third-party shadow library (e.g. `react-native-shadow-2`) or a custom drop-shadow render, both out of scope for this story's `react-native-svg`-only dependency budget.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-app-shell-navigation.md`
  summary: `react-native-svg` (newly added this story) is a native module requiring iOS pod install / Android autolinking — unconfirmed against a real native build in this sandbox (no Xcode/Android Studio available)
  evidence: found by this story's blind-hunter review. Matches this project's existing pattern (see the Story 1.3 font-linking entries above) of deferring native-build verification the sandbox can't perform; should be confirmed the next time this project is opened and built on a real Mac/Android Studio setup.

## Deferred from: code review of spec-1-4-app-shell-navigation (2026-09-09)

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-app-shell-navigation.md`
  summary: `BottomNavBar`'s FAB is fully interactive (press-dim feedback, real `accessibilityLabel`/`accessibilityRole="button"`) even though `handleFabPress` is a documented no-op this story — nothing signals to sighted or screen-reader users that it currently does nothing
  evidence: found by blind-hunter review. Deferred rather than patched blind, since the right no-op affordance (disabled styling? no accessibility change at all?) is easier to judge once Story 1.6 wires the FAB's real radial-fan action and the before/after contrast is visible.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-app-shell-navigation.md`
  summary: user-facing strings ("Inici", "Estadístiques", "Acció ràpida", "Conchi, obre Configuració") are hardcoded Catalan literals duplicated across `BottomNavBar.tsx`, `ConchiBubble.tsx`, and their test files, with no shared strings/i18n module
  evidence: found by blind-hunter review. Pre-existing pattern across the whole codebase (no i18n framework exists anywhere yet), not a regression introduced by this story specifically — introducing one is a bigger architectural decision than this review should force.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-app-shell-navigation.md`
  summary: the cradle-notch path math (`buildBarFillPath`/`buildTopRulePath`, `NOTCH_WIDTH = FAB_SIZE + 24 = 80`) has no lower-bound guard — on a window narrower than 80px (e.g. extreme Android split-screen/multi-window), `left`/`right` go negative and the cutout path is malformed
  evidence: found by edge-case-hunter review. No split-screen/multi-window support is claimed anywhere in this project; revisit if that ever becomes a target form factor.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-app-shell-navigation.md`
  summary: `BottomNavBar`'s background `Svg` is sized via `useWindowDimensions()` rather than the container's own measured width (`onLayout`) — on tablet/foldable split-screen, window width can differ from the actual rendered container width, misaligning the notch cutout from the real bar bounds
  evidence: found by blind-hunter review. Same tablet/split-screen scope question as the notch-math entry above; DESIGN.md doesn't address tablet or foldable layouts at all.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-app-shell-navigation.md`
  summary: `BottomNavBar` only reads `insets.bottom`; `insets.left`/`insets.right` are never applied, so on a landscape notched/cutout device the tab row and FAB could sit under a sensor-housing safe area
  evidence: found by blind-hunter review. Confirmed technically reachable — iPad explicitly supports landscape (`Info.plist`'s `UISupportedInterfaceOrientations~ipad`) and Android has no `screenOrientation` lock — but DESIGN.md and this spec's I/O matrix only address the bottom inset; no landscape/tablet layout has been designed at all, so a real fix needs a design decision first.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-app-shell-navigation.md`
  summary: decorative SVG glyphs inside Pressables (`HouseIcon`, `BarChartIcon`, `PlusIcon`, `ConchiBubble`'s avatar) aren't marked non-accessible, risking a screen reader announcing both the parent's `accessibilityLabel` and the raw SVG content
  evidence: found by blind-hunter review. Matches this project's existing pattern of deferring findings that need real screen-reader/device verification the sandbox can't perform.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-app-shell-navigation.md`
  summary: no test asserts that `conchiColors`' hex values (`outline`/`accent`/`collar`/`bookCover`) match DESIGN.md's recolor mapping table
  evidence: found by blind-hunter review; manually confirmed correct by this review's acceptance-auditor pass. Low-value tautological test (would duplicate the same literals), but worth adding if this palette is ever revisited.

## Deferred from: implementation of spec-1-5-settings-screen (2026-09-10)

- source_spec: `_bmad-output/implementation-artifacts/spec-1-5-settings-screen.md`
  summary: this story adds more hardcoded Catalan strings (`SettingsScreen`'s section headers, field labels, button labels, and validation/status copy) with no i18n module — mirrors Story 1.4's already-deferred i18n gap
  evidence: the spec's own Boundaries & Constraints explicitly call for matching the existing hardcoded-Catalan-strings pattern rather than adding i18n scaffolding this story; the app-wide i18n gap (no framework anywhere yet) is pre-existing, not a regression introduced here.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-5-settings-screen.md`
  summary: no client-side check rejects a blank auth secret before Acceptar sends it — an empty `Authorization: Bearer ` header goes to the server, which then surfaces as a generic HTTP-error message rather than an immediate inline validation error
  evidence: the spec's I/O matrix only requires format validation on the URL field; a blank-secret check is a reasonable UX improvement but not spec-mandated, and the current fallback (generic error on non-2xx) is not a crash or data-loss path

- source_spec: `_bmad-output/implementation-artifacts/spec-1-5-settings-screen.md`
  summary: CONNEXIÓ validation errors (network/HTTP failure) render as one shared status line with a generic message, not attributed to a specific field, and the actual HTTP status code (e.g. 401 vs 500) is discarded in favor of one generic "server error" message
  evidence: the spec only requires "a descriptive error message is shown" (satisfied); field-level attribution and status-code-specific messaging are UX polish beyond the frozen I/O matrix's wording

- source_spec: `_bmad-output/implementation-artifacts/spec-1-5-settings-screen.md`
  summary: `SettingsScreen`'s new section headers have no `accessibilityRole="header"`, and `SegmentedControl`'s options use `accessibilityRole="button"` instead of `"radio"`/`radiogroup` semantics
  evidence: matches Story 1.4's already-deferred pattern of accessibility polish items (decorative SVGs not marked non-accessible) — pre-existing project-wide gap, not spec-mandated for this story

- source_spec: `_bmad-output/implementation-artifacts/spec-1-5-settings-screen.md`
  summary: `SettingsScreen`'s form (CONNEXIÓ fields + Acceptar/Descartar) isn't wrapped in a `KeyboardAvoidingView`, so the on-screen keyboard can cover the secret field/buttons on smaller devices
  evidence: usability polish, not required by any AC; no existing screen in the codebase wraps forms this way yet either

- source_spec: `_bmad-output/implementation-artifacts/spec-1-5-settings-screen.md`
  summary: `settingsStore`'s `setWebhookUrl`/`setTheme` don't catch a `setString` (MMKV write) failure — such a failure would propagate as an unhandled rejection inside `handleAccept` with no user-facing message, unlike the explicit secure-store-write-failure handling the spec does require
  evidence: MMKV synchronous writes failing is a very low-probability edge case not covered by the frozen I/O matrix (which only calls out secure-store write failure); revisit if MMKV write failures are ever observed in practice

- source_spec: `_bmad-output/implementation-artifacts/spec-1-5-settings-screen.md`
  summary: the manual Jest mock `__mocks__/expo-secure-store.js` backs itself with a module-level `Map` that no test file resets between tests — currently harmless since every test mocks `secureStore.ts` directly instead, but a future test that exercises the real wrapper repeatedly in one file could leak state across tests
  evidence: latent test-infrastructure footgun, not an active bug; worth a `beforeEach` reset whenever a test starts relying on the manual mock directly

- source_spec: `_bmad-output/implementation-artifacts/spec-1-5-settings-screen.md`
  summary: `ConchiBubble.test.tsx` now mounts the real `SettingsScreen` (via `RootNavigator`), whose mount effect fires an unawaited `readSecureItem()` call that the test doesn't flush — no warning or failure observed in repeated runs, but the timing is a latent flakiness risk
  evidence: verified with a verbose run of `ConchiBubble.test.tsx` showing zero act()/warning output today; flagged for awareness rather than fixed blind, since there's nothing currently reproducing to fix against
