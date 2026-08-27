/**
 * Spacing tokens.
 *
 * Base unit: 4px (DESIGN.md's Spacing table). Every padding/margin/gap in the app
 * must reference one of these six tokens — no raw numeric spacing values.
 *
 * `xl` (24px) is also the documented screen horizontal edge padding convention.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
} as const;

export type SpacingTokens = typeof spacing;
