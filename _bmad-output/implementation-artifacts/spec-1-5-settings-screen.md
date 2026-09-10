---
title: 'Settings Screen (Connexió + Tema + Sobre)'
type: 'feature'
created: '2026-09-10'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '6dde8331d81876ac426c62151448633667691383'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 1.4 shipped a placeholder Settings screen reachable via the Conchi Bubble, but it renders no real UI — there's no way to configure the n8n connection, switch the app theme, or see the app version, so the app can't yet connect to a self-hosted backend.

**Approach:** Build the three-section Settings screen (CONNEXIÓ, VISUALITZACIÓ→Tema, SOBRE), wiring the already-installed-but-unused `expo-secure-store`/MMKV wrappers and the placeholder `settingsStore` to real persistence, adding the app's first minimal n8n HTTP client for the webhook validate call, and resolving `ThemeProvider`'s mode from the persisted theme setting.

## Boundaries & Constraints

**Always:**
- Auth secret persists exclusively via `writeSecureItem`/`readSecureItem` (`expo-secure-store`) — never MMKV, AsyncStorage, `.env`, or any committed asset.
- Webhook URL and theme persist via the shared MMKV `storage` wrapper (`src/lib/storage/mmkv.ts`).
- New components under `src/components/**` stay presentation-only (props/callbacks) — no `features/`/`store/` imports (ESLint AD-2 boundary).
- No raw hex/rgba outside `src/theme/**` (`no-color-literals`); reuse `typography.sectionHeader`/`fieldLabel`/`buttonText` tokens and the existing `Button` atom (`primary`=Acceptar, `secondary`=Descartar) rather than inventing new styles.
- Match the existing hardcoded-Catalan-strings pattern (no i18n scaffolding) — mirrors Story 1.4's already-deferred i18n gap.

**Ask First:** None anticipated — halt and ask only if a decision requiring a new dependency or a public API change to `ThemeProvider`/`ROUTES` surfaces mid-implementation.

**Never:** No "Endpoint SSE" field (superseded by AD-15). No Idioma toggle, Periode picker, or CONTEXTOS section — later epics. No i18n module/locale files. No changes to the FAB/entry-logging flow (Story 1.6).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy path validate | Valid URL + secret, Acceptar tapped | POST fires with `Authorization: Bearer <secret>`; on HTTP 200 URL→MMKV, secret→secure-store, success shown | N/A |
| Invalid URL format | URL missing `http(s)://` scheme | No network call; inline "URL no vàlida" shown | Client-side only |
| Secure-store write failure | HTTP 200 but `writeSecureItem` rejects | Error shown; nothing reported as saved; fields stay editable | Catch + surface error |
| Network failure/timeout | Request rejects or times out | Descriptive error shown; nothing saved; fields stay editable | Catch + surface error |
| Theme switch | Fosc/Clar/Sistema selected | Applies instantly app-wide via `ThemeProvider`; persisted to MMKV | N/A |
| Theme restart | App relaunched after a theme was set | Persisted theme applied before first frame | N/A |

</frozen-after-approval>

## Code Map

- `src/screens/SettingsScreen.tsx` -- replace placeholder with the 3-section screen (CONNEXIÓ, VISUALITZACIÓ→Tema, SOBRE); keep a `Settings`-labeled text node visible so `ConchiBubble.test.tsx`'s `screenTextShown(renderer, 'Settings')` keeps passing, or update that assertion in lockstep
- `src/components/atoms/TextField.tsx` -- new: presentational labeled input, `secureTextEntry` prop for the auth secret, `error` prop for inline validation text; follow `Button.tsx` conventions (`useTheme`, `StyleSheet.create`, no inline styles/color literals); 4px border radius, `border`/`text-secondary` tokens per DESIGN.md:41,162,323
- `src/components/atoms/SegmentedControl.tsx` -- new: presentational 3-option selector (`options`/`value`/`onChange` generic props) for Fosc/Clar/Sistema
- `src/lib/api/n8nClient.ts` -- new: `postToN8n(url: string, secret: string, body: unknown): Promise<Response>`, sets `Authorization: Bearer <secret>` header; first networking code in the repo, seeds the `lib/api/` location the architecture spine reserves for the n8n client (ARCHITECTURE-SPINE.md source-tree section)
- `src/features/settings/validateConnection.ts` -- new: scheme format check (`http://`/`https://`) then calls `postToN8n`; returns a discriminated result (`{ ok: true } | { ok: false, reason: 'format' | 'network' | 'http' }`) for the screen to render
- `src/features/settings/settingsStore.ts` -- hydrate `webhookUrl`/`theme` from MMKV (`getString('settings.webhookUrl')`, `getString('settings.theme')`) at store creation, defaulting `theme` to `'system'`; `setWebhookUrl`/`setTheme` persist via `setString` as a side effect of the existing setters
- `src/App.tsx` -- read `useSettingsStore().theme`; pass `mode={theme === 'system' ? undefined : theme}` into `<ThemeProvider>` so the picker takes effect without restart (mode prop already exists, currently used only by Storybook)
- `src/components/ConchiBubble.test.tsx` -- update only if the `'Settings'` placeholder-text assertion no longer matches the real screen's header
- `package.json` -- read-only: `import { version } from '../../package.json'` for SOBRE (`resolveJsonModule` already enabled)
- `_bmad-output/implementation-artifacts/deferred-work.md` -- append entry: this story adds more hardcoded Catalan strings, no i18n module yet (mirrors Story 1.4's deferred i18n gap)

## Tasks & Acceptance

**Execution:**
- [x] `src/components/atoms/TextField.tsx` -- new labeled/maskable input atom -- reused for webhook URL and auth secret fields
- [x] `src/components/atoms/SegmentedControl.tsx` -- new 3-option selector atom -- reused for the Tema picker
- [x] `src/lib/api/n8nClient.ts` -- minimal POST-with-bearer-auth client -- first n8n networking code, reusable by Story 1.6
- [x] `src/features/settings/validateConnection.ts` -- format check + validate call, discriminated result -- keeps networking/validation out of the screen component
- [x] `src/features/settings/settingsStore.ts` -- hydrate from and persist to MMKV -- closes the "wired up in Story 1.5" TODO
- [x] `src/screens/SettingsScreen.tsx` -- build CONNEXIÓ/VISUALITZACIÓ/SOBRE sections, wire store + validateConnection + secure-store -- delivers the story
- [x] `src/App.tsx` -- resolve `ThemeProvider` mode from persisted theme (extracted as `resolveThemeProviderMode`) -- makes the picker take effect instantly
- [x] Unit tests for `validateConnection.ts` (format-invalid, HTTP 200, HTTP error, network throw), `settingsStore.ts` (hydration, persistence side effect), `SettingsScreen.tsx` (happy path, secure-store write failure, format-invalid), and `App.tsx`'s `resolveThemeProviderMode` -- covers the I/O matrix
- [x] `_bmad-output/implementation-artifacts/deferred-work.md` -- log the i18n gap -- tracks the approved hardcoded-strings continuation

**Acceptance Criteria:**
- Given the Settings screen is opened via Conchi Bubble tap, when rendered, then three sections appear with `typography.sectionHeader`-styled headers: CONNEXIÓ, VISUALITZACIÓ (Tema only), SOBRE
- Given the CONNEXIÓ section, when rendered, then exactly two fields show: "URL del webhook" (plain text) and the auth secret (masked); no SSE field
- Given the VISUALITZACIÓ → Tema picker, when Fosc/Clar/Sistema is selected, then the theme switches immediately app-wide with no restart, and survives an app relaunch
- Given the SOBRE section, when rendered, then the app version from `package.json` is shown read-only and matches the package's semver
- Given all Settings copy, when rendered, then every label is in Catalan exactly as listed: CONNEXIÓ, URL del webhook, Acceptar, Descartar, Tema, Clar, Fosc, Sistema, Versió, SOBRE
- Given the Idioma toggle from the original UX spec, when this story ships, then it is absent — deferred to V1.1

## Design Notes

Theme resolution: `ThemeProvider`'s `mode` prop already exists (Storybook-only today); `'system'` maps to `mode={undefined}` (existing OS-scheme derivation), `'dark'`/`'light'` map to a forced `mode`. No change to `ThemeProvider` itself is expected.

Validate POST body: the AC only requires the request to fire with the bearer header and to branch on the HTTP status — send an empty JSON object (`{}`) as the ping payload; Story 1.6 will define the real entry-submission body shape on top of the same `postToN8n` client.

Secret handling: the auth secret lives in local component state during editing only (never in `settingsStore`/MMKV); on a successful Acceptar it's written to secure-store and the input can stay masked/populated, on Descartar the field reverts to what's currently persisted (empty if never saved).

## Verification

**Commands:**
- `pnpm typecheck` -- expected: exits 0
- `pnpm lint` -- expected: exits 0, including `no-color-literals` and import-boundary rules
- `pnpm test:unit` -- expected: existing tests plus new `validateConnection`/`settingsStore`/`TextField`/`SegmentedControl` tests pass

**Manual checks (if no CLI):**
- Launch in a simulator: enter an invalid URL and confirm "URL no vàlida" with no request sent; enter a valid URL/secret against a real or mock n8n endpoint and confirm success persists across an app restart; toggle Tema through all three options and confirm instant app-wide switch and persistence after relaunch

## Suggested Review Order

**CONNEXIÓ orchestration**

- Entry point — the whole save/discard lifecycle: validate, persist, error branches, in-flight lock, unmount guard.
  [`SettingsScreen.tsx:84`](../../src/screens/SettingsScreen.tsx#L84)

- Discard reverts drafts to last-persisted values, no network/persistence call.
  [`SettingsScreen.tsx:127`](../../src/screens/SettingsScreen.tsx#L127)

- Secret hydration races a user who starts typing before the read resolves — functional-updater guard avoids clobbering.
  [`SettingsScreen.tsx:60`](../../src/screens/SettingsScreen.tsx#L60)

**n8n client & validation**

- Format check happens before any network call; discriminated result keeps the screen's branches simple.
  [`validateConnection.ts:15`](../../src/features/settings/validateConnection.ts#L15)

- First networking code in the repo — auth header injection lives here, not at call sites.
  [`n8nClient.ts:21`](../../src/lib/api/n8nClient.ts#L21)

- Timeout via `AbortController`, not the newer `AbortSignal.timeout`, for Hermes/RN compatibility.
  [`n8nClient.ts:19`](../../src/lib/api/n8nClient.ts#L19)

**Persistence: MMKV + secure-store split**

- Webhook URL/theme hydrate from and persist to MMKV; secret never touches this store (AD-5).
  [`settingsStore.ts:43`](../../src/features/settings/settingsStore.ts#L43)

- Hydration reads guarded so a corrupted MMKV store degrades to defaults instead of crashing at import time.
  [`settingsStore.ts:28`](../../src/features/settings/settingsStore.ts#L28)

- Secret written to `expo-secure-store` only after a successful validate, inside its own try/catch.
  [`SettingsScreen.tsx:112`](../../src/screens/SettingsScreen.tsx#L112)

**Theme switching**

- Persisted theme resolved into `ThemeProvider`'s `mode` — instant, no restart.
  [`App.tsx:19`](../../src/App.tsx#L19)

- Three-way selector driving the store directly.
  [`SegmentedControl.tsx:1`](../../src/components/atoms/SegmentedControl.tsx#L1)

**New form atom**

- `disabled` prop locks the field during an in-flight save; wires into `editable`/`accessibilityState`.
  [`TextField.tsx:36`](../../src/components/atoms/TextField.tsx#L36)

**Tests & peripherals**

- Screen-level orchestration tests: happy path, secure-store failure, network/http branches, Descartar, in-flight lock, hydration race.
  [`SettingsScreen.test.tsx:129`](../../src/screens/SettingsScreen.test.tsx#L129)

- Reactive theme-wiring test renders the real `App`, not just the extracted pure function.
  [`App.test.tsx:1`](../../src/App.test.tsx#L1)

- Placeholder-text assertion updated to the real screen's "CONNEXIÓ" header.
  [`ConchiBubble.test.tsx:12`](../../src/components/ConchiBubble.test.tsx#L12)

- Manual Jest mock needed because the real native module throws under test.
  [`__mocks__/expo-secure-store.js:1`](../../__mocks__/expo-secure-store.js#L1)

- `src/App.tsx`/`src/App.test.tsx` added to the AD-2 boundary exemption (both need `useSettingsStore`).
  [`.eslintrc.js:75`](../../.eslintrc.js#L75)
