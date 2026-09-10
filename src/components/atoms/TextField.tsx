import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';

export type TextFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  /** Masks input characters — used for the auth secret field. */
  secureTextEntry?: boolean;
  /** Inline validation message shown below the input, e.g. "URL no vàlida". */
  error?: string;
  placeholder?: string;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  keyboardType?: TextInputProps['keyboardType'];
  /** Disables editing — e.g. while a save request is in flight. */
  disabled?: boolean;
};

/**
 * Presentational labeled input atom (DESIGN.md: `border`/`text-secondary` tokens,
 * 4px input radius per DESIGN.md:162). Follows `Button.tsx`'s conventions —
 * `useTheme`, `StyleSheet.create`, no inline styles/color literals.
 */
export function TextField({
  label,
  value,
  onChangeText,
  secureTextEntry = false,
  error,
  placeholder,
  autoCapitalize = 'none',
  keyboardType = 'default',
  disabled = false,
}: TextFieldProps): React.JSX.Element {
  const { colors, typography, spacing } = useTheme();

  const dynamicStyles = StyleSheet.create({
    container: {
      marginBottom: spacing.lg,
    },
    error: {
      color: colors.danger,
      marginTop: spacing.xs,
    },
    input: {
      borderColor: error ? colors.danger : colors.border,
      color: colors.textPrimary,
      opacity: disabled ? 0.5 : 1,
      paddingHorizontal: spacing.md,
    },
    label: {
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
  });

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <Text style={[typography.fieldLabel, dynamicStyles.label]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        editable={!disabled}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        secureTextEntry={secureTextEntry}
        style={[typography.fieldValue, styles.input, dynamicStyles.input]}
        value={value}
      />
      {error ? <Text style={[typography.fieldValue, dynamicStyles.error]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  input: {
    borderRadius: 4,
    borderWidth: 1,
    height: 44,
  },
});
