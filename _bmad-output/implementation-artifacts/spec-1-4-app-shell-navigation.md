---
title: 'App Shell & Navigation'
type: 'feature'
created: '2026-08-31'
status: 'done'
review_loop_iteration: 0
baseline_commit: '121a1fca98cebeb8dbd7653becbb4074385aec8e'
context: ['{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-conchi-2026-08-22/DESIGN.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The app currently boots into bare Home/Analytics/Settings tab screens with no shared chrome — no bottom nav visual identity, no FAB, and no consistent way to reach Settings — so the app has no visual identity yet and nothing for later stories (1.5, 1.6) to anchor to.

**Approach:** Build a custom notched/cradle bottom tab bar (SVG Bézier cutout) with an elevated FAB, wire `ThemeProvider` into `App.tsx`, and mount a global 48px Conchi Bubble (Idle-state placeholder art, tap-to-Settings) as an overlay above the navigator, using Story 1.3's tokens and the existing typed `ROUTES`.

## Boundaries & Constraints

**Always:** New raw hex values (Conchi's recolor palette) go only into `src/theme/colors.ts`, never inlined elsewhere (repo-wide `no-color-literals`); bottom nav and FAB visuals use `react-native-svg` (new dependency — no plain-View approach can render the cradle cutout); every tap target (tabs, FAB, Conchi Bubble) is ≥44×44px; the bottom bar respects the bottom safe-area inset via the already-installed `react-native-safe-area-context`; active tab icon/label render in `accent`, inactive in `textTertiary`; `ThemeProvider` wraps the existing `SafeAreaProvider → NavigationContainer → RootNavigator` tree in `src/App.tsx` (Story 1.3 deliberately left this unmounted for this story); Conchi Bubble is a simple `react-native-svg` placeholder tinted with DESIGN.md's exact recolor hexes, approved this session as a stand-in for the not-yet-available `conchi-idle.png`, structured so swapping in the real artwork later touches only `ConchiBubble.tsx`.

**Ask First:** none — scope and the Conchi-art placeholder substitution were confirmed with Marc this session.

**Never:** Do not implement the FAB's radial fan (Escriure/Càmera/PDF) — out of scope until Epic 2; do not wire the FAB to any real action — that's Story 1.6, this story's FAB is visually complete with a no-op `onPress`; do not build Conchi Bubble's Working/Error states or its crossfade — this story's AC only exercises Idle; do not add `react-native-gesture-handler` or any icon-font library — not required at this scope.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Tab press | User taps Analytics while Home is active | Analytics screen shows; Home dims to `textTertiary`, Analytics turns `accent` | N/A |
| Notched/dynamic-island device | App renders on a device with a display cutout | Bar height includes bottom safe-area inset; content never obscured | N/A |
| Conchi Bubble tap | User taps the bubble from Home, Analytics, or Settings itself | Navigation goes to Settings every time | N/A |
| FAB tap (this epic) | User taps the FAB | No navigation or action occurs (documented no-op, wired in Story 1.6) | N/A |

</frozen-after-approval>

## Code Map

- `src/theme/colors.ts` -- add `conchiColors = { outline: '#2c1a0a', accent: '#c8922a', collar: '#fdfaf4', bookCover: '#4a2e12' }` (DESIGN.md:241-244), mode-independent like existing `staticColors`
- `src/App.tsx` -- wrap the existing `SafeAreaProvider → NavigationContainer → RootNavigator` tree in `ThemeProvider`; mount `<ConchiBubble />` as an absolutely-positioned sibling so it floats above every screen, including the stack-level Settings screen
- `src/navigation/index.tsx` -- `MainTabs` (bottom-tabs) gets `tabBar={props => <BottomNavBar {...props} />}`
- `src/navigation/BottomNavBar.tsx` -- new: custom tab bar via `useTheme()` + `useSafeAreaInsets()`; SVG `Path` cradle cutout (bg `navBg`, 1px top `rule`, shadow per DESIGN.md:174-193), Home/Analytics buttons (`HouseIcon`/`BarChartIcon` + `typography.navLabel`), and the FAB (56px, `accent` bg, `PlusIcon` in `bg`, elevation 8, no-op `onPress`, per DESIGN.md:196-213)
- `src/components/icons/HouseIcon.tsx`, `BarChartIcon.tsx`, `PlusIcon.tsx` -- new: small `react-native-svg` glyphs, `{ color, size }` props
- `src/components/ConchiBubble.tsx` -- new: 48px circle, absolute top-right, SVG placeholder tinted with `conchiColors`, typed `useNavigation()` to `ROUTES.Settings` on press (DESIGN.md:217-244)
- `package.json` -- add `react-native-svg`
- `_bmad-output/implementation-artifacts/deferred-work.md` -- append entry: swap the SVG placeholder for real hand-drawn `conchi-idle`/`working`/`error` art once available
- `src/navigation/routes.ts` -- verify only: `ROUTES`/`StackParamList`/`TabParamList` already cover Home/Analytics/AppTabs/Settings, no changes needed
- `src/screens/HomeScreen.tsx`, `AnalyticsScreen.tsx`, `SettingsScreen.tsx` -- verify only: existing placeholder stubs already satisfy the "placeholder screens" AC

## Tasks & Acceptance

**Execution:**
- [x] `package.json` -- add `react-native-svg` -- required for the cradle cutout and all new icons
- [x] `src/theme/colors.ts` -- add `conchiColors` placeholder palette -- keeps "hex only in colors.ts" invariant intact
- [x] `src/components/icons/HouseIcon.tsx`, `BarChartIcon.tsx`, `PlusIcon.tsx` -- SVG glyphs, size/color props -- tab and FAB icons
- [x] `src/navigation/BottomNavBar.tsx` -- cradle-cutout tab bar + FAB per DESIGN.md dims -- replaces the default tab bar
- [x] `src/navigation/index.tsx` -- wire `BottomNavBar` as `MainTabs`' custom `tabBar` -- activates the new bar
- [x] `src/components/ConchiBubble.tsx` -- 48px placeholder avatar, tap → Settings -- required by AC
- [x] `src/App.tsx` -- mount `ThemeProvider` + global `ConchiBubble` overlay -- required by AC ("any screen")
- [x] `deferred-work.md` -- log the real-art follow-up -- tracks the approved placeholder substitution

**Acceptance Criteria:**
- Given the app is open on any screen, when the bottom nav renders, then it shows the notched cradle cutout with the FAB in the notch, Home tab left, Analytics tab right, both tabs ≥44×44px
- Given the app launches, when the root navigator initializes, then HomeScreen is the default screen and Analytics/Settings are reachable without crashing, all routes typed via `ROUTES`
- Given the Conchi Bubble, when rendered on any screen, then it is a 48px circle fixed top-right using the approved SVG placeholder tinted with DESIGN.md's four recolor hexes

## Spec Change Log

## Design Notes

The cradle cutout is an SVG `Path` using cubic Bézier commands to carve a semicircular dip sized to the FAB (56px) at top-center of the bar — no plain-View masking approach reproduces a smooth curve, hence the new `react-native-svg` dependency (not needed by Stories 1.1–1.3). Conchi Bubble's placeholder is a simple geometric SVG (not an attempt at the final pixel-art character) tinted with the four DESIGN.md recolor hexes as a literal `conchiColors` palette — swapping in the real `conchi-idle.png` later is a single-file change to `ConchiBubble.tsx` with zero call-site impact. `BottomNavBar` and the FAB mount inside `MainTabs`'s custom `tabBar` prop (Home/Analytics only); `ConchiBubble` instead mounts once at the `App.tsx` root, outside the tab/stack tree, since it must also appear on the stack-level Settings screen, which the tab bar never renders.

## Verification

**Commands:**
- `pnpm typecheck` -- expected: exits 0
- `pnpm lint` -- expected: exits 0, including `no-color-literals` and the feature-sliced import-boundary rules
- `pnpm test` -- expected: existing tests still pass, no regressions to Button/theme

**Manual checks (if no CLI):**
- Launch the app in a simulator: confirm the cradle shape, FAB position, active/inactive tab coloring, Conchi Bubble tap navigating to Settings from Home/Analytics/Settings itself, and that a simulated notch/dynamic-island safe-area inset doesn't obscure content

## Suggested Review Order

**App shell composition — the entry point**

- Where the whole story comes together: `ThemeProvider` finally mounted, `ConchiBubble` added as a `NavigationContainer` sibling so it floats above every screen.
  [`App.tsx:9`](../../src/App.tsx#L9)

**Bottom nav — cradle cutout & FAB**

- Custom `tabBar` render function — replaces the default bar entirely to support the notch/FAB design.
  [`BottomNavBar.tsx:85`](../../src/navigation/BottomNavBar.tsx#L85)

- The cradle-cutout path itself: cubic Bézier curves carving a dip sized to the FAB, the reason this story needed `react-native-svg`.
  [`BottomNavBar.tsx:44`](../../src/navigation/BottomNavBar.tsx#L44)

- Nav bar shadow (DESIGN.md's `0 -1px 0 rgba(0,0,0,0.12)`) plus an Android `elevation` fallback, added in the review pass.
  [`BottomNavBar.tsx:176`](../../src/navigation/BottomNavBar.tsx#L176)

- Tab buttons use the standard `"tab"` accessibility role and an always-explicit `selected` state, and dim on press like `Button.tsx`.
  [`BottomNavBar.tsx:130`](../../src/navigation/BottomNavBar.tsx#L130)

- FAB is visually complete but a documented no-op this story — real wiring is Story 1.6.
  [`BottomNavBar.tsx:151`](../../src/navigation/BottomNavBar.tsx#L151)

- Wiring the custom bar into `MainTabs`.
  [`navigation/index.tsx:16`](../../src/navigation/index.tsx#L16)

**Conchi Bubble — global floating avatar**

- Component entry point: 48px circle, mounted once outside the tab/stack tree so it also reaches the stack-level Settings screen.
  [`ConchiBubble.tsx:28`](../../src/components/ConchiBubble.tsx#L28)

- `useNavigation()` typed as the honest `NavigationProp<StackParamList>` (not a stack-screen-specific type), since this component isn't inside a Screen.
  [`ConchiBubble.tsx:35`](../../src/components/ConchiBubble.tsx#L35)

- The SVG placeholder itself, tinted with DESIGN.md's four recolor hexes — approved stand-in for the real `conchi-idle.png`.
  [`ConchiBubble.tsx:57`](../../src/components/ConchiBubble.tsx#L57)

**Color tokens**

- `conchiColors`: the character recolor palette, kept out of `useTheme()` since it's mode-independent.
  [`colors.ts:79`](../../src/theme/colors.ts#L79)

- `fabShadow`/`navBarShadow`/`conchiBubbleShadow`: single-layer approximations of DESIGN.md's shadow specs, given RN's one-shadow-layer limit.
  [`colors.ts:67`](../../src/theme/colors.ts#L67)

**Peripherals — icons, tests, config**

- Shared `IconProps` lives in its own neutral module rather than being borrowed from one specific icon file (a review-pass fix).
  [`icons/types.ts:1`](../../src/components/icons/types.ts#L1)

- `HouseIcon`/`BarChartIcon`/`PlusIcon`: small `react-native-svg` glyphs, sized/colored by the caller.
  [`HouseIcon.tsx:11`](../../src/components/icons/HouseIcon.tsx#L11)

- Tab tint, tab-press navigation, safe-area bar height, and FAB no-op — the four I/O-matrix rows this file covers.
  [`BottomNavBar.test.tsx:79`](../../src/navigation/BottomNavBar.test.tsx#L79)

- Mounts the real `RootNavigator` + `ConchiBubble` tree to prove the tap-to-Settings matrix row end-to-end, not just in isolation.
  [`ConchiBubble.test.tsx:85`](../../src/components/ConchiBubble.test.tsx#L85)

- New native dependency this story introduces, required by the cradle cutout and all icons.
  [`package.json:33`](../../package.json#L33)
</content>
