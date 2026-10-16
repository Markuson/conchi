import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { conchiColors, staticColors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { ROUTES, type StackParamList } from '../navigation/routes';
import { IS_DETOX } from '../lib/constants';
import { roundTripError } from '../lib/conchiCopy';
import conchiIdle from '../assets/images/conchi-idle.png';
import conchiWorking from '../assets/images/conchi-working.png';
import conchiError from '../assets/images/conchi-error.png';

/** Bubble diameter (DESIGN.md's Conchi Bubble spec: "circle, 48px diameter"). */
const BUBBLE_SIZE = 48;
/** Fade/scale duration for hiding on Settings and reappearing on leaving it. */
const APPEAR_DURATION_MS = 220;
/** Crossfade duration between the three state images (Story 2.4's frozen boundary: "~200ms crossfade"). */
const CROSSFADE_DURATION_MS = 200;
/** Error state auto-reverts to idle after this long (Story 2.4's frozen boundary), independent of whatever `state` the caller keeps feeding in. */
const ERROR_AUTO_REVERT_MS = 10000;

export type ConchiBubbleState = 'idle' | 'working' | 'error';

export type ConchiBubbleProps = {
  /**
   * Story 2.4's round-trip lifecycle. Driven by `App.tsx`'s single
   * `useEntrySubmission` instance (its only call site) — `'idle'` while
   * nothing is in flight or a result has just been shown, `'working'` while
   * Phase 2 (awaiting the FCM `round_trip_result`) is in progress, `'error'`
   * on a Phase 1 failure or Phase 2 timeout.
   */
  state: ConchiBubbleState;
};

const STATE_ART: Record<ConchiBubbleState, typeof conchiIdle> = {
  idle: conchiIdle,
  working: conchiWorking,
  error: conchiError,
};

/**
 * `ConchiBubble` has no text UI of its own — the accessibility label is the
 * only place Story 2.4's Error-state copy (`lib/conchiCopy.ts`) actually
 * surfaces, so screen-reader users learn about a failure the same way
 * sighted users do (the art switching to `conchi-error.png`).
 */
const STATE_ACCESSIBILITY_LABEL: Record<ConchiBubbleState, string> = {
  idle: 'Conchi, obre Configuració',
  working: 'Conchi: treballant-hi.',
  error: `Conchi: ${roundTripError}`,
};

/**
 * Persistent floating avatar mounted once at `App.tsx`'s root, outside the
 * tab/stack tree, so it renders above every screen including the stack-level
 * Settings screen (which the bottom tab bar never reaches). Tapping it always
 * navigates to Settings (DESIGN.md: "Tap: opens Settings"), regardless of
 * `state`. On Settings itself the bubble hides (fades/scales out) — a
 * "go to Settings" affordance is pointless while already there — and
 * fades/scales back in on leaving.
 *
 * Renders the real `conchi-idle.png`/`conchi-working.png`/`conchi-error.png`
 * art, crossfading between them over `CROSSFADE_DURATION_MS` as `state`
 * changes (Story 2.4). An `'error'` display self-reverts to `'idle'` after
 * `ERROR_AUTO_REVERT_MS` regardless of whether the caller keeps feeding
 * `'error'` in — that auto-revert is this component's own responsibility,
 * not `useEntrySubmission`'s.
 */
export function ConchiBubble({ state }: ConchiBubbleProps): React.JSX.Element {
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
      const navState = navigation.getState();
      setActiveRouteName(navState?.routes[navState.index]?.name);
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

  // The displayed state tracks `state`, except an 'error' display schedules
  // its own revert back to 'idle' after ERROR_AUTO_REVERT_MS.
  const [displayState, setDisplayState] = useState<ConchiBubbleState>(state);
  useEffect(() => {
    setDisplayState(state);
    if (state !== 'error') {
      return undefined;
    }
    const timeoutId = setTimeout(() => setDisplayState('idle'), ERROR_AUTO_REVERT_MS);
    return () => clearTimeout(timeoutId);
  }, [state]);

  // Crossfade: the previous art stays fully opaque as a static base layer;
  // the new art fades in on top of it over CROSSFADE_DURATION_MS, which
  // reads identically to a true cross-dissolve once it completes (both
  // layers share the same bubble mask/shape). Skipped (set immediately)
  // under IS_DETOX, mirroring `ConfirmationCard.tsx`'s own convention for
  // disabling non-deterministic animation timing in Detox builds.
  const [currentArt, setCurrentArt] = useState<typeof conchiIdle>(STATE_ART[state]);
  const previousArtRef = useRef<typeof conchiIdle>(STATE_ART[state]);
  const crossfade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const nextArt = STATE_ART[displayState];
    if (nextArt === currentArt) {
      return;
    }
    previousArtRef.current = currentArt;
    setCurrentArt(nextArt);
    if (IS_DETOX) {
      crossfade.setValue(1);
      return;
    }
    crossfade.setValue(0);
    Animated.timing(crossfade, {
      toValue: 1,
      duration: CROSSFADE_DURATION_MS,
      useNativeDriver: true,
    }).start();
    // `currentArt` is intentionally excluded -- it's set by this same effect
    // as a derived value, not an independent trigger; including it would
    // re-run this effect a second time for every state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayState, crossfade]);

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
        accessibilityLabel={STATE_ACCESSIBILITY_LABEL[displayState]}
        onPress={handlePress}
        // `Pressable` has no default visual press feedback on either platform —
        // dim opacity while pressed, same convention as `Button.tsx`.
        style={({ pressed }) => [styles.bubble, pressed && styles.pressed]}
      >
        <Image source={previousArtRef.current} style={[styles.art, StyleSheet.absoluteFill]} resizeMode="contain" />
        <Animated.Image
          source={currentArt}
          style={[styles.art, StyleSheet.absoluteFill, { opacity: crossfade }]}
          resizeMode="contain"
        />
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
