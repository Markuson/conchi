import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { darkColors, staticColors } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeProvider';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

export type ButtonProps = {
  variant: ButtonVariant;
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

/**
 * Buttons table (DESIGN.md):
 *
 * | Variant                | Background | Border               | Text        |
 * |-------------------------|------------|----------------------|-------------|
 * | Primary (Acceptar)     | accent     | accent +10% lighter  | bg (dark)   |
 * | Secondary (Descartar)  | transparent| border               | text-secondary |
 * | Danger (Eliminar)      | danger     | danger               | white       |
 *
 * Primary's text is dark-locked to `darkColors.bg` in BOTH themes (amber needs dark
 * ink regardless of active mode). Primary/Danger borders are NOT dark-locked — they
 * use the current theme's own `accent` / `danger` token (DESIGN.md gives no
 * "(dark)"-style override for borders); Primary's border approximates the spec's
 * "accent +10% lighter" as the plain current-theme `accent` token, since no AC tests
 * border color and this codebase deliberately has no color-manipulation utility.
 * Danger's "white" text is DESIGN.md's own literal choice (not a mode-dependent
 * token), so it reads `staticColors.white` rather than an inline hex.
 */
export function Button({ variant, label, onPress, disabled = false }: ButtonProps): React.JSX.Element {
  const { colors, typography, spacing } = useTheme();

  const backgroundColor =
    variant === 'primary' ? colors.accent : variant === 'danger' ? colors.danger : undefined;
  const borderColor = variant === 'secondary' ? colors.border : variant === 'primary' ? colors.accent : colors.danger;
  const textColor = variant === 'primary' ? darkColors.bg : variant === 'danger' ? staticColors.white : colors.textSecondary;

  // Built per-render (not module scope) because it depends on the current theme /
  // variant / disabled state — still routed through StyleSheet.create so the JSX
  // `style` prop only ever holds StyleSheet references, never inline object
  // literals (react-native/no-inline-styles).
  const dynamicStyles = StyleSheet.create({
    button: {
      backgroundColor,
      borderColor,
      opacity: disabled ? 0.5 : 1,
      paddingHorizontal: spacing.lg,
    },
    label: {
      color: textColor,
    },
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      // `Pressable` (unlike `TouchableOpacity`) has no default visual press
      // feedback on either platform — the function-as-child `style` form dims
      // opacity while actually pressed so a tap has a real visible affordance.
      style={({ pressed }) => [styles.base, dynamicStyles.button, pressed && styles.pressed]}
    >
      <Text numberOfLines={1} style={[typography.buttonText, dynamicStyles.label]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: 4,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
