import { Platform } from 'react-native';
import type { TextStyle } from 'react-native';

/**
 * Font family constants.
 *
 * Three fonts, three roles, no overlap (DESIGN.md's Typography philosophy):
 * Special Elite for hero numbers only, Courier Prime for all data surfaces,
 * System UI for shell chrome (nav, buttons, labels).
 *
 * `specialElite` / `courierPrime*` are the fonts' actual embedded PostScript
 * names (verified with fontTools against the downloaded .ttf files) — Android/iOS
 * match custom fonts on this internal name, not the file name, so a mismatch here
 * would silently fall back to the system font with no error. Real weight/style-named
 * files are used (Bold/Italic are separate files) rather than relying on RN's
 * unreliable synthetic bold/italic for custom fonts — so weight-bearing or italic
 * roles below select the matching file directly and never also set `fontWeight` /
 * `fontStyle` on top of it.
 *
 * `system` mirrors DESIGN.md's CSS-style system font stack
 * (`-apple-system, BlinkMacSystemFont, 'Roboto', sans-serif`) via RN's own
 * per-platform system font names.
 */
export const fontFamily = {
  specialElite: 'SpecialElite-Regular',
  courierPrimeRegular: 'CourierPrime-Regular',
  courierPrimeBold: 'CourierPrime-Bold',
  courierPrimeItalic: 'CourierPrime-Italic',
  system: Platform.select<string>({ ios: 'System', android: 'Roboto', default: 'System' }),
} as const;

/**
 * Per-role text styles, one per row of DESIGN.md's Typography > Role Assignments
 * table. `letterSpacing` values are converted from DESIGN.md's em-relative Letter
 * Spacing table to px (RN's `letterSpacing` is a px/dp number, not an em unit):
 * `letterSpacing_px = em * role_fontSize_px`. Roles the Letter Spacing table doesn't
 * mention are left with RN's default (0) spacing.
 */

/** Hero total — home header balance amount. */
export const hero: TextStyle = {
  fontFamily: fontFamily.specialElite,
  fontSize: 32,
};

/** Month section total — right of month header, `accent` color (caller-applied). */
export const monthTotal: TextStyle = {
  fontFamily: fontFamily.specialElite,
  fontSize: 13,
};

/** Confirmation card amount — editable, top of Confirmation Card. */
export const confirmationAmount: TextStyle = {
  fontFamily: fontFamily.specialElite,
  fontSize: 28,
};

/** Row amount — right side of expense row. */
export const rowAmount: TextStyle = {
  fontFamily: fontFamily.courierPrimeBold,
  fontSize: 15,
  letterSpacing: -0.15, // -0.01em * 15px
};

/** Row category — left primary. */
export const rowCategory: TextStyle = {
  fontFamily: fontFamily.courierPrimeRegular,
  fontSize: 13,
};

/** Row subcategory / date — secondary; subcategory usage is uppercase (caller-applied). */
export const rowSubDate: TextStyle = {
  fontFamily: fontFamily.courierPrimeRegular,
  fontSize: 10,
};

/** Drum picker — selected (center item, uppercase). */
export const drumSelected: TextStyle = {
  fontFamily: fontFamily.courierPrimeBold,
  fontSize: 13,
  letterSpacing: 1.04, // 0.08em * 13px
  textTransform: 'uppercase',
};

/** Drum picker — ghost (above/below items, 28% opacity). */
export const drumGhost: TextStyle = {
  fontFamily: fontFamily.courierPrimeRegular,
  fontSize: 10,
  letterSpacing: 0.8, // 0.08em * 10px
  opacity: 0.28,
};

/** Field values — description, date, attachment filename. */
export const fieldValue: TextStyle = {
  fontFamily: fontFamily.courierPrimeRegular,
  fontSize: 12,
};

/** Conchi quote — Confirmation Card personality line. */
export const conchiQuote: TextStyle = {
  fontFamily: fontFamily.courierPrimeItalic,
  fontSize: 12,
};

/** Section header — e.g. CONNEXIÓ, VISUALITZACIÓ (uppercase). */
export const sectionHeader: TextStyle = {
  fontFamily: fontFamily.system,
  fontSize: 10,
  fontWeight: '600',
  letterSpacing: 1.4, // 0.14em * 10px
  textTransform: 'uppercase',
};

/** Field label — e.g. Descripció, Context, Data (uppercase). */
export const fieldLabel: TextStyle = {
  fontFamily: fontFamily.system,
  fontSize: 9,
  fontWeight: '600',
  letterSpacing: 1.08, // 0.12em * 9px
  textTransform: 'uppercase',
};

/** Nav label — e.g. Inici, Estadístiques. */
export const navLabel: TextStyle = {
  fontFamily: fontFamily.system,
  fontSize: 10,
  fontWeight: '500',
  letterSpacing: 0.6, // 0.06em * 10px
};

/** Button text — e.g. Acceptar, Descartar, Eliminar (uppercase). */
export const buttonText: TextStyle = {
  fontFamily: fontFamily.system,
  fontSize: 11,
  fontWeight: '700',
  letterSpacing: 1.1, // 0.10em * 11px
  textTransform: 'uppercase',
};

/** Filter chip — Analytics filter chips. */
export const filterChip: TextStyle = {
  fontFamily: fontFamily.system,
  fontSize: 11,
  fontWeight: '500',
};

export const typography = {
  hero,
  monthTotal,
  confirmationAmount,
  rowAmount,
  rowCategory,
  rowSubDate,
  drumSelected,
  drumGhost,
  fieldValue,
  conchiQuote,
  sectionHeader,
  fieldLabel,
  navLabel,
  buttonText,
  filterChip,
} as const;

export type Typography = typeof typography;
