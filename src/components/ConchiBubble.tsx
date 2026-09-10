import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { conchiColors, staticColors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { ROUTES, type StackParamList } from '../navigation/routes';
import conchiIdle from '../assets/images/conchi-idle.png';

/** Bubble diameter (DESIGN.md's Conchi Bubble spec: "circle, 48px diameter"). */
const BUBBLE_SIZE = 48;
/** Fade/scale duration for hiding on Settings and reappearing on leaving it. */
const APPEAR_DURATION_MS = 220;

/**
 * Persistent floating avatar mounted once at `App.tsx`'s root, outside the
 * tab/stack tree, so it renders above every screen including the stack-level
 * Settings screen (which the bottom tab bar never reaches). Tapping it
 * navigates to Settings from Home or Analytics (DESIGN.md: "Tap: opens
 * Settings"). On Settings itself the bubble hides (fades/scales out) — a
 * "go to Settings" affordance is pointless while already there — and
 * fades/scales back in on leaving; originally resolved this way during
 * Story 1.4's code review to dodge that screen's native header (since
 * removed in favor of a custom top-left back button), but the self-reference
 * reasoning above stands on its own regardless.
 *
 * Renders the real `conchi-idle.png` art (`src/assets/images/`). Only the
 * Idle state is wired this story; `conchi-working.png`/`conchi-error.png`
 * already exist alongside it but have no trigger yet (that needs the SSE/push
 * plumbing from a later epic) — see `deferred-work.md`.
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
      // Position/size live here, not on the inner `Pressable`: a view whose
      // only child is `position: 'absolute'` contributes no size to normal
      // flow and collapses to zero height, which (as this wrapper is a flex
      // sibling of the full-height `RootNavigator`) pushed the whole bubble
      // off the bottom of the screen. Anchoring the wrapper itself avoids that.
      style={[
        styles.wrapper,
        {
          top: insets.top + spacing.md,
          shadowColor: staticColors.conchiBubbleShadow,
          opacity: appear,
          transform: [{ scale: appear.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Conchi, obre Configuració"
        onPress={handlePress}
        // `Pressable` has no default visual press feedback on either platform —
        // dim opacity while pressed, same convention as `Button.tsx`.
        style={({ pressed }) => [styles.bubble, pressed && styles.pressed]}
      >
        <Image source={conchiIdle} style={styles.art} resizeMode="contain" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  art: {
    height: '100%',
    width: '100%',
  },
  bubble: {
    alignItems: 'center',
    // Backdrop behind the art's transparent margin, and gives iOS's shadow
    // renderer an opaque layer to anchor to (a fully transparent container's
    // shadow rendering is otherwise unreliable).
    backgroundColor: conchiColors.bookCover,
    borderRadius: BUBBLE_SIZE / 2,
    height: '100%',
    justifyContent: 'center',
    // Clips the art to the circle — DESIGN.md: "Shape: circle, 48px diameter".
    overflow: 'hidden',
    width: '100%',
  },
  pressed: {
    opacity: 0.7,
  },
  wrapper: {
    elevation: 6,
    height: BUBBLE_SIZE,
    position: 'absolute',
    right: spacing.xl,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    // DESIGN.md's Conchi bubble shadow: `0 2px 12px rgba(0,0,0,0.30)`.
    shadowRadius: 12,
    width: BUBBLE_SIZE,
  },
});
