import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { conchiColors, staticColors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { ROUTES, type StackParamList } from '../navigation/routes';

/** Bubble diameter (DESIGN.md's Conchi Bubble spec: "circle, 48px diameter"). */
const BUBBLE_SIZE = 48;
/** Fade/scale duration for hiding on Settings and reappearing on leaving it. */
const APPEAR_DURATION_MS = 220;

/**
 * Persistent floating avatar mounted once at `App.tsx`'s root, outside the
 * tab/stack tree, so it renders above every screen including the stack-level
 * Settings screen (which the bottom tab bar never reaches). Tapping it
 * navigates to Settings from Home or Analytics (DESIGN.md: "Tap: opens
 * Settings"). On Settings itself the bubble hides (fades/scales out) instead
 * of overlapping that screen's native header, and fades/scales back in on
 * leaving — resolved this way during this story's code review, renegotiating
 * the spec's original "tappable from Settings itself too" boundary.
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
  // `useNavigationState` requires being inside a Navigator's subtree, which
  // `ConchiBubble` isn't — it's a `NavigationContainer` sibling. `useNavigation()`'s
  // root-ref object supports `getState()`/`addListener('state', ...)` even from
  // here, so route changes are tracked manually instead.
  const [activeRouteName, setActiveRouteName] = useState<string | undefined>(
    () => navigation.getState()?.routes[navigation.getState()?.index ?? 0]?.name,
  );
  useEffect(() => {
    return navigation.addListener('state', () => {
      const state = navigation.getState();
      setActiveRouteName(state?.routes[state.index]?.name);
    });
  }, [navigation]);
  const isOnSettings = activeRouteName === ROUTES.Settings;

  // RN core `Animated` (no new dependency) drives the hide-on-Settings /
  // reappear-on-leaving effect.
  const appear = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(appear, {
      toValue: isOnSettings ? 0 : 1,
      duration: APPEAR_DURATION_MS,
      useNativeDriver: true,
    }).start();
  }, [isOnSettings, appear]);

  const handlePress = (): void => {
    navigation.navigate(ROUTES.Settings);
  };

  return (
    <Animated.View
      pointerEvents={isOnSettings ? 'none' : 'auto'}
      style={{
        opacity: appear,
        transform: [{ scale: appear.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
      }}
    >
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    alignItems: 'center',
    // Matches the SVG's own circle fill exactly (visually identical) — gives
    // iOS's shadow renderer an opaque layer to anchor to instead of a fully
    // transparent container, whose shadow rendering is otherwise unreliable.
    backgroundColor: conchiColors.bookCover,
    borderRadius: BUBBLE_SIZE / 2,
    elevation: 6,
    height: BUBBLE_SIZE,
    justifyContent: 'center',
    position: 'absolute',
    right: spacing.xl,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    // DESIGN.md's Conchi bubble shadow: `0 2px 12px rgba(0,0,0,0.30)`.
    shadowRadius: 12,
    width: BUBBLE_SIZE,
  },
  pressed: {
    opacity: 0.7,
  },
});
