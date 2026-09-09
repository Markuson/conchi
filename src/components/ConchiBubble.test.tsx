/**
 * Coverage for spec-1-4's I/O & Edge-Case Matrix rows "Conchi Bubble tap" (tapping
 * from Home or Analytics navigates to Settings) and "Conchi Bubble on/leaving
 * Settings" (hides on Settings — resolved this way during code review, since it
 * would otherwise overlap Settings' native header — and reappears on leaving).
 * Builds the same tree `App.tsx` mounts (`ThemeProvider` → `SafeAreaProvider` →
 * `NavigationContainer` → `RootNavigator` + `ConchiBubble`) rather than importing
 * `App` directly, so a real `initialMetrics` can be given to `SafeAreaProvider` —
 * without it, `SafeAreaProvider` never resolves its (native-module-driven) insets
 * under Jest and renders `null` children forever, which is also why
 * `__tests__/App.test.tsx`'s existing smoke test only proves `App` doesn't throw,
 * not that anything actually mounts. `useNavigation()`'s root-ref fallback (see
 * `@react-navigation/core`'s `useNavigation.tsx`) needs a real, live
 * `NavigationContainer` ancestor, so `ConchiBubble` is exercised here rather than
 * in isolation. Uses `react-test-renderer`, this repo's existing convention (see
 * `atoms/Button.test.tsx`).
 */
import React from 'react';
import ReactTestRenderer, { act, type ReactTestRenderer as Renderer } from 'react-test-renderer';
import { Text } from 'react-native';
import { createNavigationContainerRef, NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ConchiBubble } from './ConchiBubble';
import { RootNavigator } from '../navigation';
import { ThemeProvider } from '../theme/ThemeProvider';

const CONCHI_LABEL = 'Conchi, obre Configuració';
const navigationRef = createNavigationContainerRef();

// `BottomTabView` (mounted transitively via `RootNavigator`) schedules a
// `setTimeout` on focus change that it clears in its own effect cleanup — which
// only runs on unmount. Track and unmount every renderer created in a test so
// that cleanup fires and no timer outlives the test (otherwise Jest logs an
// "update not wrapped in act()" warning from a timer firing after teardown).
let activeRenderer: Renderer | undefined;

afterEach(() => {
  if (activeRenderer) {
    act(() => {
      activeRenderer?.unmount();
    });
    activeRenderer = undefined;
  }
});

function renderAppShell(): Renderer {
  let renderer!: Renderer;
  act(() => {
    renderer = ReactTestRenderer.create(
      <ThemeProvider mode="dark">
        <SafeAreaProvider
          initialMetrics={{
            frame: { x: 0, y: 0, width: 390, height: 844 },
            insets: { top: 47, left: 0, right: 0, bottom: 34 },
          }}
        >
          <NavigationContainer ref={navigationRef}>
            <RootNavigator />
            <ConchiBubble />
          </NavigationContainer>
        </SafeAreaProvider>
      </ThemeProvider>,
    );
  });
  activeRenderer = renderer;
  return renderer;
}

function pressByLabel(renderer: Renderer, label: string): void {
  const [node] = renderer.root.findAll(
    (n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function',
  );
  if (!node) {
    throw new Error(`No pressable found with accessibilityLabel "${label}"`);
  }
  const onPress = node.props.onPress as () => void;
  act(() => {
    onPress();
  });
}

/** Placeholder screens (`HomeScreen`/`AnalyticsScreen`/`SettingsScreen`) each render a single distinguishing `<Text>`. */
function screenTextShown(renderer: Renderer, text: string): boolean {
  return renderer.root.findAllByType(Text).some((node) => node.props.children === text);
}

/** Walks up from the Conchi Bubble's `Pressable` to its `Animated.View` wrapper's `pointerEvents` prop. */
function bubblePointerEvents(renderer: Renderer): string | undefined {
  const [pressable] = renderer.root.findAll(
    (n) => n.props.accessibilityLabel === CONCHI_LABEL && typeof n.props.onPress === 'function',
  );
  let node = pressable?.parent;
  while (node && node.props.pointerEvents === undefined) {
    node = node.parent;
  }
  return node?.props.pointerEvents as string | undefined;
}

test('tapping the Conchi Bubble from Home navigates to Settings', () => {
  const renderer = renderAppShell();
  expect(screenTextShown(renderer, 'Home')).toBe(true);

  pressByLabel(renderer, CONCHI_LABEL);

  expect(screenTextShown(renderer, 'Settings')).toBe(true);
});

test('tapping the Conchi Bubble from Analytics navigates to Settings', () => {
  const renderer = renderAppShell();
  pressByLabel(renderer, 'Estadístiques');
  expect(screenTextShown(renderer, 'Analytics')).toBe(true);

  pressByLabel(renderer, CONCHI_LABEL);

  expect(screenTextShown(renderer, 'Settings')).toBe(true);
});

test('Conchi Bubble hides once navigated to Settings, and reappears on leaving', () => {
  const renderer = renderAppShell();
  expect(bubblePointerEvents(renderer)).toBe('auto');

  pressByLabel(renderer, CONCHI_LABEL);
  expect(screenTextShown(renderer, 'Settings')).toBe(true);
  expect(bubblePointerEvents(renderer)).toBe('none');

  act(() => {
    navigationRef.current?.goBack();
  });
  expect(screenTextShown(renderer, 'Home')).toBe(true);
  expect(bubblePointerEvents(renderer)).toBe('auto');
});
