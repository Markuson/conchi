import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';

export type SegmentedControlOption<T extends string> = {
  label: string;
  value: T;
};

export type SegmentedControlProps<T extends string> = {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

/**
 * Presentational 3-option selector atom (generic over any string-literal union)
 * — used for the Tema picker (Fosc/Clar/Sistema). Follows `Button.tsx`'s
 * conventions: `useTheme`, `StyleSheet.create`, no inline styles/color literals.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>): React.JSX.Element {
  const { colors, typography } = useTheme();

  const dynamicStyles = StyleSheet.create({
    labelSelected: {
      color: colors.accent,
    },
    labelUnselected: {
      color: colors.textSecondary,
    },
    segmentSelected: {
      backgroundColor: colors.accentMuted,
      borderColor: colors.accent,
    },
    segmentUnselected: {
      borderColor: colors.border,
    },
  });

  return (
    <View style={styles.container}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityLabel={option.label}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected ? dynamicStyles.segmentSelected : dynamicStyles.segmentUnselected]}
          >
            <Text style={[typography.buttonText, selected ? dynamicStyles.labelSelected : dynamicStyles.labelUnselected]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  segment: {
    alignItems: 'center',
    borderRadius: 4,
    borderWidth: 1,
    flex: 1,
    height: 44,
    justifyContent: 'center',
    marginHorizontal: 4,
  },
});
