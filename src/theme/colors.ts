/**
 * Color tokens.
 *
 * This is the ONLY file in the codebase allowed to contain raw hex/rgba color
 * literals (DESIGN.md's "all components reference semantic tokens, never raw hex
 * values" rule, mechanically enforced elsewhere by `react-native/no-color-literals`).
 * Every other file must reference `darkColors` / `lightColors` / `staticColors`.
 *
 * Values are copied verbatim from DESIGN.md's Color Palette tables (dark = default,
 * light = alternate mode).
 */

/** Dark mode palette (default). */
export const darkColors = {
  bg: '#18140f',
  surface: '#201a13',
  surfaceAlt: '#261e15',
  textPrimary: '#fdfaf4',
  textSecondary: '#b09870',
  textTertiary: '#7a6a50',
  accent: '#c8922a',
  accentMuted: 'rgba(200,146,42,0.18)',
  accentUnderline: 'rgba(200,146,42,0.55)',
  rule: 'rgba(253,250,244,0.07)',
  border: 'rgba(253,250,244,0.11)',
  danger: '#8b2020',
  dangerBg: 'rgba(139,32,32,0.22)',
  navBg: '#18140f',
  // Single-layer approximation of DESIGN.md's two-layer FAB shadow
  // (`0 4px 16px rgba(200,146,42,0.50), 0 2px 6px rgba(0,0,0,0.35)`) — RN's
  // `shadow*` style props support one shadow layer, same "no color-manipulation
  // utility" tradeoff already documented in `Button.tsx`. Uses the outer (larger,
  // more visible) glow layer's color.
  fabShadow: 'rgba(200,146,42,0.50)',
} as const;

/** Light mode palette. */
export const lightColors = {
  bg: '#faf6ee',
  surface: '#fdf9f3',
  surfaceAlt: '#fffcf5',
  textPrimary: '#1a1510',
  textSecondary: '#7a6a50',
  textTertiary: '#9a8a68',
  accent: '#b8860b',
  accentMuted: 'rgba(184,134,11,0.12)',
  accentUnderline: 'rgba(184,134,11,0.45)',
  rule: 'rgba(26,21,16,0.09)',
  border: 'rgba(26,21,16,0.12)',
  danger: '#8b1a1a',
  dangerBg: 'rgba(139,26,26,0.10)',
  navBg: '#f2ede2',
  // See darkColors.fabShadow — light-mode counterpart of DESIGN.md's FAB shadow
  // outer layer (`0 4px 16px rgba(184,134,11,0.38), 0 2px 6px rgba(26,21,16,0.20)`).
  fabShadow: 'rgba(184,134,11,0.38)',
} as const;

/**
 * Colors that DESIGN.md specifies as literal values rather than mode-dependent
 * semantic tokens (e.g. Danger button text is literal white in both themes).
 * Kept out of `useTheme()` on purpose — these never vary by mode.
 *
 * `navBarShadow` and `conchiBubbleShadow` are likewise mode-independent per
 * DESIGN.md's Elevation & Shadows table (each gives a single value, not a
 * dark/light pair).
 */
export const staticColors = {
  white: '#ffffff',
  navBarShadow: 'rgba(0,0,0,0.12)',
  conchiBubbleShadow: 'rgba(0,0,0,0.30)',
} as const;

/**
 * Conchi's pixel-art recolor palette (DESIGN.md's "Pixel art asset recolor
 * mapping" table). Mode-independent — the character's colors don't shift with
 * the app theme. Currently consumed by `ConchiBubble.tsx`'s SVG placeholder;
 * will apply identically to the real `conchi-idle.png` art once available.
 */
export const conchiColors = {
  outline: '#2c1a0a',
  accent: '#c8922a',
  collar: '#fdfaf4',
  bookCover: '#4a2e12',
} as const;

export type ColorTokens = Record<keyof typeof darkColors, string>;
