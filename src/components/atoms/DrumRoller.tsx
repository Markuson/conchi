import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';

export type DrumRollerOption<T extends string> = {
  label: string;
  value: T;
};

export type DrumRollerProps<T extends string> = {
  label: string;
  options: DrumRollerOption<T>[];
  selected: T;
  onChange: (value: T) => void;
  /**
   * Renders the closed-state selected value in `colors.textTertiary` with a
   * leading ⚠️ — used by `ConfirmationCard` for the mismatched-category case
   * (I/O matrix: "Unrecognized category"), where `selected` doesn't match
   * any of `options` because it's been auto-defaulted.
   */
  warning?: boolean;
  /**
   * Controlled open state — when provided (alongside `onOpenChange`), the
   * parent owns whether this roller's options list is shown, letting it
   * coordinate several `DrumRoller`s (e.g. closing one when another opens).
   * Omit both to fall back to the roller's own internal open state.
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/**
 * Generic tap-to-open options picker atom (`<T extends string>`), mirroring
 * `SegmentedControl.tsx`'s generic-over-`T` pattern. `ConfirmationCard` reuses
 * this one implementation for category/subcategory/currency/context — only
 * `options`/`selected`/`onChange` differ per field.
 *
 * Styled via `typography.drumSelected` (closed-state value, and the open
 * list's currently-selected row) / `typography.drumGhost` (the open list's
 * other rows) per DESIGN.md's Drum Roller typography roles. Tapping the
 * closed control opens the options list below it; tapping an option fires
 * `onChange` and closes the list again (AC: "opens with the correct options
 * and updates + closes on selection").
 */
export function DrumRoller<T extends string>({
  label,
  options,
  selected,
  onChange,
  warning = false,
  open: controlledOpen,
  onOpenChange,
}: DrumRollerProps<T>): React.JSX.Element {
  const { colors, typography, spacing } = useTheme();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = (value: boolean): void => {
    if (isControlled) {
      onOpenChange?.(value);
    } else {
      setInternalOpen(value);
    }
  };

  const selectedOption = options.find(option => option.value === selected);
  const selectedLabel = selectedOption?.label ?? selected;

  const handleSelect = (value: T): void => {
    onChange(value);
    setOpen(false);
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      marginBottom: spacing.lg,
    },
    label: {
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    optionRow: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    optionSelected: {
      color: colors.accent,
    },
    optionUnselected: {
      color: colors.textSecondary,
    },
    options: {
      borderColor: colors.border,
    },
    selectedText: {
      color: warning ? colors.textTertiary : colors.textPrimary,
    },
    trigger: {
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
    },
  });

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <Text style={[typography.fieldLabel, dynamicStyles.label]}>{label}</Text>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        // `accessibilityLabel` on this trigger overrides the accessible name
        // a screen reader would otherwise derive from the `Text` child below,
        // so the current selection is surfaced separately via
        // `accessibilityValue` rather than silently going unannounced.
        accessibilityValue={{
          text: warning ? `⚠️ ${selectedLabel}` : selectedLabel,
        }}
        onPress={() => setOpen(!open)}
        style={[styles.trigger, dynamicStyles.trigger]}
      >
        <Text
          numberOfLines={1}
          style={[typography.drumSelected, dynamicStyles.selectedText]}
        >
          {warning ? `⚠️ ${selectedLabel}` : selectedLabel}
        </Text>
      </Pressable>
      {open ? (
        <View style={[styles.options, dynamicStyles.options]}>
          {options.map(option => {
            const isSelected = option.value === selected;
            return (
              <Pressable
                key={option.value}
                accessibilityLabel={option.label}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => handleSelect(option.value)}
                style={dynamicStyles.optionRow}
              >
                <Text
                  style={[
                    isSelected ? typography.drumSelected : typography.drumGhost,
                    isSelected
                      ? dynamicStyles.optionSelected
                      : dynamicStyles.optionUnselected,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  options: {
    borderTopWidth: 1,
  },
  trigger: {
    borderRadius: 4,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
  },
});
