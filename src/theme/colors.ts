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
} as const;

/**
 * Colors that DESIGN.md specifies as literal values rather than mode-dependent
 * semantic tokens (e.g. Danger button text is literal white in both themes).
 * Kept out of `useTheme()` on purpose — these never vary by mode.
 */
export const staticColors = {
  white: '#ffffff',
} as const;

export type ColorTokens = Record<keyof typeof darkColors, string>;
