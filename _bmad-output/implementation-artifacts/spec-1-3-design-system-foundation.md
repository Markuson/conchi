---
title: 'Design System Foundation'
type: 'feature'
created: '2026-08-28'
status: 'done'
review_loop_iteration: 0
baseline_commit: '6116d56a5330f97ebea8da9e0d0b4cda6da9afe3'
context: ['{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-conchi-2026-08-22/DESIGN.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** No color, typography, or spacing tokens exist yet, so every future screen/component would either hardcode raw values or invent its own convention. Story 1.4/1.5 and everything after need a settled, reusable foundation plus a proof-of-concept component (Button) and a working Storybook.

**Approach:** Add `src/theme/` (colors, typography, spacing, `ThemeProvider`/`useTheme`) mirroring DESIGN.md exactly; build `Button` (Primary/Secondary/Danger) atop it; add its Storybook story with a dark/light toggle; enable the `no-color-literals` lint rule to make the "tokens only" rule mechanically enforced going forward. `lib/types/analytics.ts` and `lib/types/entry.ts` already satisfy this story's type ACs from Story 1.1 — verify only, no changes.

## Boundaries & Constraints

**Always:** Color/typography/spacing values copied verbatim from DESIGN.md; `src/theme/colors.ts` is the only file allowed to contain raw hex/rgba literals (all other files reference tokens); Primary button **text only** always reads `darkColors.bg` regardless of active theme (DESIGN.md's "bg (dark)" annotation — amber needs dark ink in both modes); Primary/Danger **borders** use the *current* theme's own `accent`/`danger` token, not a dark-locked value; Danger button text uses a `staticColors.white` token (DESIGN.md specifies literal white, not a palette token) — never an inline hex; `useColorScheme()` returning `null` defaults to dark mode (DESIGN.md's stated default).

**Ask First:** none — no destructive or irreversible step in this story.

**Never:** Do not wire `ThemeProvider` into `App.tsx` (Story 1.4 owns app-shell wiring); do not modify `lib/types/analytics.ts` or `lib/types/entry.ts` (already correct); no color-manipulation utility (e.g. programmatic "lighten 10%") — Primary's border approximates DESIGN.md's "`accent` +10% lighter" as the current theme's plain `accent` token, since no AC tests border color and DESIGN.md gives no "(dark)"-style override for it; do not add the on-device Storybook (`@storybook/react-native`) bootstrap flagged in `.storybook/main.cjs`'s comment — not required by any AC, carved out to keep this spec in budget, tracked in `deferred-work.md`.

</frozen-after-approval>

## Code Map

- `src/lib/types/analytics.ts` -- already exports `AnalyticsFilterParams`/`AnalyticsTotals`/`AnalyticsResponse` matching the AC verbatim — verify only
- `src/lib/types/entry.ts` -- already has required `userId: string` — verify only
- `.storybook/preview.cjs` -- add `globalTypes.theme` toolbar (dark/light) + a decorator wrapping stories in `ThemeProvider`
- `.eslintrc.js` -- flip `react-native/no-color-literals` from `'off'` to `'error'`; add an override disabling it only for `src/theme/**`
- `package.json` -- no changes; styling is plain `StyleSheet` + Context per AD-1 (bare RN, no styling library) — do not add nativewind/styled-components/tamagui/etc.

New files:
- `src/theme/colors.ts` -- `darkColors`/`lightColors` (14 keys each, from DESIGN.md's Color Palette tables) + `staticColors = { white: '#ffffff' }`
- `src/theme/typography.ts` -- font family constants (`'SpecialElite-Regular'`, `'CourierPrime-Regular'`, `'CourierPrime-Bold'`, `'CourierPrime-Italic'`, system stack) + one `TextStyle` object per DESIGN.md Typography role table (hero, monthTotal, confirmationAmount, rowAmount, rowCategory, rowSubDate, drumSelected, drumGhost, fieldValue, conchiQuote, sectionHeader, fieldLabel, navLabel, buttonText, filterChip), letter-spacing per DESIGN.md's table
- `src/theme/spacing.ts` -- `{ xs:4, sm:8, md:12, lg:16, xl:24, '2xl':32 }`
- `src/theme/ThemeProvider.tsx` -- Context + `useTheme()`; picks dark/light colors via `useColorScheme()`; accepts optional `mode` prop to force a mode (used only by the Storybook decorator)
- `src/theme/index.ts` -- barrel re-export
- `src/components/atoms/Button.tsx` -- `variant: 'primary'|'secondary'|'danger'`, `label`, `onPress`, `disabled?`; 44px height, 4px radius, `typography.buttonText` styling
- `src/components/atoms/Button.stories.tsx` -- CSF3 stories for all three variants
- `src/assets/fonts/` -- Special Elite Regular; Courier Prime Regular/Bold/Italic (`.ttf`, sourced from Google Fonts per DESIGN.md's Font Stack links) -- real weight/style-named files, not relying on synthetic bold/italic (RN doesn't reliably synthesize either for custom fonts)
- `react-native.config.js` -- `assets: ['./src/assets/fonts']` for native font linking

## Tasks & Acceptance

**Execution:**
- [x] `src/theme/colors.ts` -- define both 14-key palettes + `staticColors` -- single source of truth, no raw hex anywhere else
- [x] `src/theme/typography.ts` -- define per-role text styles -- enforces the three-font role separation
- [x] `src/theme/spacing.ts` -- define the 6 spacing tokens -- single source for all padding/margin/gap
- [x] `src/theme/ThemeProvider.tsx` + `src/theme/index.ts` -- context, `useTheme()`, optional `mode` override -- lets Button (and Storybook) consume tokens without app-shell wiring
- [x] `src/components/atoms/Button.tsx` -- 3 variants per DESIGN.md's Buttons table -- first real consumer proving the token system works
- [x] `src/components/atoms/Button.stories.tsx` -- 3 variant stories -- required by AC
- [x] `.storybook/preview.cjs` -- theme toggle decorator -- required by AC ("both dark and light mode")
- [x] `.eslintrc.js` -- enable `no-color-literals`, override off for `src/theme/**` -- makes "tokens only" mechanically enforced
- [x] `src/assets/fonts/*.ttf` + `react-native.config.js` + platform-native linking (Android `assets/fonts`, iOS `Info.plist` `UIAppFonts` + Xcode bundle resources) -- required for the typography roles to actually render the specified fonts
- [x] Verify `src/lib/types/analytics.ts` and `src/lib/types/entry.ts` unchanged and matching AC -- no regressions
- [x] `.storybook/main.cjs` -- add `webpackFinal` aliasing `@storybook/react-dom-shim` to its React-18 (`createRoot`) build -- required for stories to render at all under this repo's `react-dom@19.2.3`; see Design Notes

**Acceptance Criteria:**
- Given any component, when it references a color, then it uses a semantic token from `src/theme/colors.ts`, never a raw hex value; all 14 dark-mode and 14 light-mode tokens from DESIGN.md are defined
- Given the typography system, when Special Elite is applied, then it appears only on hero-role text (home total, month section total, Confirmation Card amount); Courier Prime is used for all data surfaces; System UI for all shell surfaces
- Given the spacing system, when any component applies padding/margin/gap, then it references one of the 6 spacing tokens; 24px horizontal edge padding is the documented screen convention
- Given the Button component, when rendered Primary/Secondary/Danger, then each matches DESIGN.md's Buttons table exactly (colors, 44px height, 4px radius, System UI 11px 700 uppercase 0.10em)
- Given the Storybook scaffold, when `pnpm storybook` runs, then the Button story is visible showing all three variants in both dark and light mode
- Given `lib/types/analytics.ts` and `lib/types/entry.ts`, when imported, then they match this story's type ACs exactly (already true — regression check only)

## Spec Change Log

## Design Notes

Primary button's "bg (dark)" text reads `darkColors.bg` directly (not the active theme's token) — DESIGN.md specifies this explicitly because amber needs dark ink in both app themes; its border does not carry that annotation, so it stays on the current theme's `accent` (same for Danger's border on `danger`) — only text is dark-locked. Danger's "white" text is DESIGN.md's own literal choice, not a palette token, so it gets one narrowly-scoped `staticColors.white` rather than an inline hex, keeping the "no raw hex outside `colors.ts`" rule intact; `staticColors` is a plain constant import from `src/theme/colors.ts` (not routed through `useTheme()`), since it doesn't vary by mode. `ThemeProvider` is deliberately usable standalone (not yet mounted in `App.tsx`) — Story 1.4 builds the app shell that will mount it; Storybook's decorator instantiates it directly for isolated rendering. Verify each font's actual internal PostScript name (not its Google Fonts filename) before using it as `fontFamily` — Android/iOS match on the embedded name, and a mismatch silently falls back to the system font with no error. `disabled` renders at reduced opacity (0.5 — a plain RN convention, not a DESIGN.md token, since none exists); pressed-state is implemented explicitly via `Pressable`'s function-as-child `style` prop (dims to 0.7 opacity while `pressed`) — `Pressable`, unlike `TouchableOpacity`, has no default visual press feedback on either platform, so this had to be added rather than relied on; `label` truncates to one line (`numberOfLines={1}`) rather than wrapping. `@storybook/react-dom-shim`'s own preset (`dist/preset.js`) only switches to its React-18 `createRoot` shim when `react-dom`'s version string starts with `'18'`; it has no React 19 case, so on this repo's `react-dom@19.2.3` it silently fell through to the React 16 shim, which calls `ReactDOM.unmountComponentAtNode` — an API React 19 removed, so every story failed to mount at all (confirmed by serving `build-storybook`'s output and loading each story in a real headless browser before the fix, and again after). Fixed with a `webpackFinal` alias in `.storybook/main.cjs` forcing the React 18 shim unconditionally — its `createRoot`-based implementation is what React 19 actually expects, so this is correct regardless of the version-string mismatch, and required no `package.json` change.

## Verification

**Commands:**
- `pnpm typecheck` -- expected: exits 0
- `pnpm lint` -- expected: exits 0, including the newly-enabled `no-color-literals` rule
- `pnpm build-storybook` -- expected: exits 0, static build includes the Button story
- `grep -n "#[0-9a-fA-F]\{3,6\}" src/theme/typography.ts src/theme/spacing.ts src/theme/ThemeProvider.tsx src/components/atoms/Button.tsx` -- expected: no matches (hex values live only in `colors.ts`)

**Manual checks (if no CLI):**
- If the sandbox lacks Xcode/Android Studio to complete native font linking, leave `src/assets/fonts/` + `react-native.config.js` in place, document the exact remaining native-project steps, and report them out-of-band for Marc to finish locally

**Done — verified via headless browser (2026-08-27):** All three variants (Primary/Secondary/Danger) render correctly in both dark and light Storybook toolbar states, confirming the AC visually, not just via `build-storybook`'s exit code. This required fixing a pre-existing `react-dom@19`/Storybook-7 renderer incompatibility (see Design Notes) that silently broke every story mount, discovered only because Button.stories.tsx is the first real story in the repo.

## Suggested Review Order

**Color tokens — the foundation**

- Entry point: the only file allowed to contain raw hex/rgba — everything else references these.
  [`colors.ts:14`](../../src/theme/colors.ts#L14)

- Light palette mirrors dark 1:1, same 14 keys — the pair AC #1 checks.
  [`colors.ts:32`](../../src/theme/colors.ts#L32)

- Non-mode-dependent literal ("white") isolated here instead of inlined as a raw hex.
  [`colors.ts:54`](../../src/theme/colors.ts#L54)

**Theme context — mode resolution**

- `useColorScheme()` returning null falls back to dark (DESIGN.md's stated default), not left ambiguous.
  [`ThemeProvider.tsx:40`](../../src/theme/ThemeProvider.tsx#L40)

- `mode` prop force-overrides system scheme — the seam Storybook's toggle depends on.
  [`ThemeProvider.tsx:37`](../../src/theme/ThemeProvider.tsx#L37)

**Button component — first token consumer**

- Primary/Danger text is dark-locked; borders use the current theme — the one AC-driven asymmetry to verify.
  [`Button.tsx:40`](../../src/components/atoms/Button.tsx#L40)

- Real press feedback via function-as-child `style` — `Pressable` has none by default (a spec correction).
  [`Button.tsx:67`](../../src/components/atoms/Button.tsx#L67)

**Typography — three fonts, three roles**

- `conchiQuote` selects the dedicated italic file only, no redundant `fontStyle` layered on top.
  [`typography.ts:100`](../../src/theme/typography.ts#L100)

**Storybook — visual verification**

- Theme toggle now paints the canvas itself, not just the component, per the review round's fix.
  [`preview.cjs:10`](../../.storybook/preview.cjs#L10)

- Forces the React-18 (`createRoot`) shim — `react-dom@19` broke every story mount without it.
  [`main.cjs:43`](../../.storybook/main.cjs#L43)

- Fourth story exercises `disabled`, previously unrendered anywhere.
  [`Button.stories.tsx:38`](../../src/components/atoms/Button.stories.tsx#L38)

**Enforcement — lint**

- `no-color-literals` flipped on repo-wide; the one carve-out is where tokens are legitimately defined.
  [`.eslintrc.js:63`](../../.eslintrc.js#L63)

**Peripherals**

- Native font linking config — the seam that makes `typography.ts`'s `fontFamily` values resolve at runtime.
  [`react-native.config.js:11`](../../react-native.config.js#L11)

- Disabled-state test reaches into `Pressability`'s actual gate, not just a shallow render check.
  [`Button.test.tsx:44`](../../src/components/atoms/Button.test.tsx#L44)
