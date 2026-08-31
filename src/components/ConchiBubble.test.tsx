/**
 * Coverage for spec-1-4's I/O & Edge-Case Matrix row "Conchi Bubble tap":
 * tapping the bubble from Home, Analytics, or Settings itself must navigate to
 * Settings every time. Builds the same tree `App.tsx` mounts (`ThemeProvider` →
 * `SafeAreaProvider` → `NavigationContainer` → `RootNavigator` + `ConchiBubble`)
 * rather than importing `App` directly, so a real `initialMetrics` can be given
 * to `SafeAreaProvider` — without it, `SafeAreaProvider` never resolves its
 * (native-module-driven) insets under Jest and renders `null` children forever,
 * which is also why `__tests__/App.test.tsx`'s existing smoke test only proves
 * `App` doesn't throw, not that anything actually mounts. `useNavigation()`'s
 * root-ref fallback (see `@react-navigation/core`'s `useNavigation.tsx`) needs a
 * real, live `NavigationContainer` ancestor, so `ConchiBubble` is exercised here
 * rather than in isolation. Uses `react-test-renderer`, this repo's existing
 * convention (see `atoms/Button.test.tsx`).
 */
import React from 'react';
import ReactTestRenderer, { act, type ReactTestRenderer as Renderer } from 'react-test-renderer';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ConchiBubble } from './ConchiBubble';
import { RootNavigator } from '../navigation';
import { ThemeProvider } from '../theme/ThemeProvider';

const CONCHI_LABEL = 'Conchi, obre Configuració';

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
          <NavigationContainer>
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

test('tapping the Conchi Bubble while already on Settings stays on Settings', () => {
  const renderer = renderAppShell();
  pressByLabel(renderer, CONCHI_LABEL);
  expect(screenTextShown(renderer, 'Settings')).toBe(true);

  pressByLabel(renderer, CONCHI_LABEL);

  expect(screenTextShown(renderer, 'Settings')).toBe(true);
});
