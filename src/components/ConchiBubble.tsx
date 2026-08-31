import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { conchiColors, staticColors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { ROUTES, type StackParamList } from '../navigation/routes';

/** Bubble diameter (DESIGN.md's Conchi Bubble spec: "circle, 48px diameter"). */
const BUBBLE_SIZE = 48;

/**
 * Persistent floating avatar mounted once at `App.tsx`'s root, outside the
 * tab/stack tree, so it renders above every screen including the stack-level
 * Settings screen (which the bottom tab bar never reaches). Tapping it always
 * navigates to Settings, from any screen — including from Settings itself
 * (DESIGN.md: "Tap: opens Settings (from any screen)").
 *
 * The SVG below is a simple geometric placeholder (approved this session as a
 * stand-in for the not-yet-available `conchi-idle.png`), tinted with DESIGN.md's
 * exact four recolor hexes (`conchiColors`). Only this file needs to change once
 * the real hand-drawn art is available — see `deferred-work.md`. This story only
 * renders the Idle state; Working/Error states and their crossfade are out of
 * scope (spec-1-4's "Never" boundary).
 */
export function ConchiBubble(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  // `ConchiBubble` is mounted as a sibling of `RootNavigator`, outside any
  // Screen, so `NavigationProp<StackParamList>` (the honest shape for a
  // navigation object obtained via `useNavigation()`'s root-ref fallback) is
  // used here rather than a `NativeStackNavigationProp`, which implies being
  // inside a native-stack screen.
  const navigation = useNavigation<NavigationProp<StackParamList>>();

  const handlePress = (): void => {
    navigation.navigate(ROUTES.Settings);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Conchi, obre Configuració"
      onPress={handlePress}
      // `Pressable` has no default visual press feedback on either platform —
      // dim opacity while pressed, same convention as `Button.tsx`.
      style={({ pressed }) => [
        styles.bubble,
        {
          top: insets.top + spacing.md,
          shadowColor: staticColors.conchiBubbleShadow,
        },
        pressed && styles.pressed,
      ]}
    >
      <Svg width={BUBBLE_SIZE} height={BUBBLE_SIZE} viewBox="0 0 48 48">
        <Circle cx={24} cy={24} r={23} fill={conchiColors.bookCover} stroke={conchiColors.outline} strokeWidth={2} />
        <Circle cx={24} cy={30} r={11} fill={conchiColors.collar} />
        <Path
          d="M17 19c2-3 5-4.5 7-4.5s5 1.5 7 4.5"
          stroke={conchiColors.outline}
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />
        <Circle cx={24} cy={19} r={3} fill={conchiColors.accent} />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bubble: {
    alignItems: 'center',
    borderRadius: BUBBLE_SIZE / 2,
    elevation: 6,
    height: BUBBLE_SIZE,
    justifyContent: 'center',
    position: 'absolute',
    right: spacing.xl,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    width: BUBBLE_SIZE,
  },
  pressed: {
    opacity: 0.7,
  },
});
