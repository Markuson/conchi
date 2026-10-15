/**
 * Coverage for spec-1-4's I/O & Edge-Case Matrix rows "Conchi Bubble tap" (tapping
 * from Home or Analytics navigates to Settings) and "Conchi Bubble on/leaving
 * Settings" (hides on Settings — resolved this way during code review, since it
 * would otherwise overlap Settings' native header — and reappears on leaving),
 * plus Story 2.4's new `state` prop: the idle/working/error accessibility label
 * and the error state's 10s auto-revert-to-idle.
 *
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
 *
 * `RootNavigator` now takes an `entrySubmission` prop (Story 2.4) — a stub is
 * built locally (a structural type, not imported from `src/features/**`, since
 * `src/components/**` must never import from there, AD-2) since this file's own
 * tests only care about `ConchiBubble`'s navigation/state behavior, not the
 * round-trip flow itself (covered by `navigation/index.test.tsx` and
 * `useEntrySubmission.test.ts`).
 */
import React from 'react';
import ReactTestRenderer, {
  act,
  type ReactTestInstance,
  type ReactTestRenderer as Renderer,
} from 'react-test-renderer';
import { Text } from 'react-native';
import { createNavigationContainerRef, NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ConchiBubble, type ConchiBubbleState } from './ConchiBubble';
import { RootNavigator } from '../navigation';
import { ThemeProvider } from '../theme/ThemeProvider';

const CONCHI_LABEL = 'Conchi, obre Configuració';
const navigationRef = createNavigationContainerRef();

type EntrySubmissionStub = {
  status: 'idle' | 'submitting' | 'waiting' | 'error' | 'ready';
  errorMessage: string | undefined;
  entryResult: undefined;
  saveStatus: 'idle' | 'saving' | 'error';
  saveErrorMessage: string | undefined;
  checkConfigured: () => Promise<boolean>;
  submit: (text: string) => Promise<void>;
  retry: () => Promise<void>;
  reset: () => void;
  saveEntry: (data: unknown) => Promise<boolean>;
  handleRoundTripResult: (entry: unknown) => void;
};

function createEntrySubmissionStub(): EntrySubmissionStub {
  return {
    status: 'idle',
    errorMessage: undefined,
    entryResult: undefined,
    saveStatus: 'idle',
    saveErrorMessage: undefined,
    checkConfigured: jest.fn().mockResolvedValue(false),
    submit: jest.fn().mockResolvedValue(undefined),
    retry: jest.fn().mockResolvedValue(undefined),
    reset: jest.fn(),
    saveEntry: jest.fn().mockResolvedValue(true),
    handleRoundTripResult: jest.fn(),
  };
}

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

function renderAppShell(bubbleState: ConchiBubbleState = 'idle'): Renderer {
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
            <RootNavigator entrySubmission={createEntrySubmissionStub()} />
            <ConchiBubble state={bubbleState} />
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

/**
 * `HomeScreen`/`AnalyticsScreen` are still placeholders that each render a single
 * distinguishing `<Text>`. `SettingsScreen` is real as of Story 1.5 — it's checked
 * via its "CONNEXIÓ" section header instead of a placeholder label.
 */
function screenTextShown(renderer: Renderer, text: string): boolean {
  return renderer.root.findAllByType(Text).some((node) => node.props.children === text);
}

/** Walks up from the Conchi Bubble's `Pressable` to its `Animated.View` wrapper's `pointerEvents` prop. */
function bubblePointerEvents(renderer: Renderer): string | undefined {
  const [pressable] = findConchiBubblePressable(renderer);
  let node = pressable?.parent;
  while (node && node.props.pointerEvents === undefined) {
    node = node.parent;
  }
  return node?.props.pointerEvents as string | undefined;
}

/**
 * Locates the Conchi Bubble's `Pressable` by prefix rather than an exact
 * label — Story 2.4's `state` prop changes the accessibility label per
 * state (idle/working/error all start with "Conchi").
 */
function findConchiBubblePressable(renderer: Renderer): ReactTestInstance[] {
  return renderer.root.findAll(
    (n) =>
      typeof n.props.accessibilityLabel === 'string' &&
      n.props.accessibilityLabel.startsWith('Conchi') &&
      typeof n.props.onPress === 'function',
  );
}

function bubbleAccessibilityLabel(renderer: Renderer): string {
  const [node] = findConchiBubblePressable(renderer);
  if (!node) {
    throw new Error('No Conchi Bubble pressable found');
  }
  return node.props.accessibilityLabel as string;
}

test('tapping the Conchi Bubble from Home navigates to Settings', () => {
  const renderer = renderAppShell();
  expect(screenTextShown(renderer, 'Home')).toBe(true);

  pressByLabel(renderer, CONCHI_LABEL);

  expect(screenTextShown(renderer, 'CONNEXIÓ')).toBe(true);
});

test('tapping the Conchi Bubble from Analytics navigates to Settings', () => {
  const renderer = renderAppShell();
  pressByLabel(renderer, 'Estadístiques');
  expect(screenTextShown(renderer, 'Analytics')).toBe(true);

  pressByLabel(renderer, CONCHI_LABEL);

  expect(screenTextShown(renderer, 'CONNEXIÓ')).toBe(true);
});

test('Conchi Bubble hides once navigated to Settings, and reappears on leaving', () => {
  const renderer = renderAppShell();
  expect(bubblePointerEvents(renderer)).toBe('auto');

  pressByLabel(renderer, CONCHI_LABEL);
  expect(screenTextShown(renderer, 'CONNEXIÓ')).toBe(true);
  expect(bubblePointerEvents(renderer)).toBe('none');

  act(() => {
    navigationRef.current?.goBack();
  });
  expect(screenTextShown(renderer, 'Home')).toBe(true);
  expect(bubblePointerEvents(renderer)).toBe('auto');
});

describe('Story 2.4: state prop', () => {
  test('idle (the default) shows the "open Settings" accessibility label', () => {
    const renderer = renderAppShell('idle');
    expect(bubbleAccessibilityLabel(renderer)).toBe(CONCHI_LABEL);
  });

  test('working shows a distinct "treballant-hi" accessibility label', () => {
    const renderer = renderAppShell('working');
    expect(bubbleAccessibilityLabel(renderer)).toBe('Conchi: treballant-hi.');
  });

  test('error shows the Error-state copy, then auto-reverts to idle after 10s', () => {
    jest.useFakeTimers();
    const renderer = renderAppShell('error');
    expect(bubbleAccessibilityLabel(renderer)).toContain('Alguna cosa ha anat malament.');

    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(bubbleAccessibilityLabel(renderer)).toBe(CONCHI_LABEL);
    jest.useRealTimers();
  });

  test('error does not auto-revert before the 10s mark', () => {
    jest.useFakeTimers();
    const renderer = renderAppShell('error');

    act(() => {
      jest.advanceTimersByTime(9000);
    });

    expect(bubbleAccessibilityLabel(renderer)).toContain('Alguna cosa ha anat malament.');
    jest.useRealTimers();
  });
});
