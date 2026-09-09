/**
 * Coverage for spec-1-4's I/O & Edge-Case Matrix rows owned by this file:
 * "Tab press" (active/inactive tint + navigation), "Notched/dynamic-island
 * device" (bar height grows by the bottom safe-area inset), and "FAB tap"
 * (documented no-op — no navigation or emit). Uses `react-test-renderer`, this
 * repo's existing convention (see `atoms/Button.test.tsx`).
 */
import React from 'react';
import ReactTestRenderer, { act, type ReactTestRenderer as Renderer } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Svg from 'react-native-svg';

import { BottomNavBar } from './BottomNavBar';
import { ROUTES } from './routes';
import { ThemeProvider } from '../theme/ThemeProvider';
import { darkColors } from '../theme/colors';
import { HouseIcon } from '../components/icons/HouseIcon';
import { BarChartIcon } from '../components/icons/BarChartIcon';

/** Bar content height (excluding safe-area inset) — mirrors `BottomNavBar.tsx`'s own constant. */
const BAR_HEIGHT = 64;

type FakeNavigation = {
  emit: jest.Mock;
  navigate: jest.Mock;
};

function buildFakeNavigation(defaultPrevented = false): FakeNavigation {
  return {
    emit: jest.fn(() => ({ defaultPrevented })),
    navigate: jest.fn(),
  };
}

function renderBar(navigation: FakeNavigation, insetsBottom: number, activeIndex: number): Renderer {
  const props = {
    state: {
      index: activeIndex,
      routes: [
        { key: 'home-key', name: ROUTES.Home },
        { key: 'analytics-key', name: ROUTES.Analytics },
      ],
    },
    navigation,
  } as unknown as BottomTabBarProps;

  let renderer!: Renderer;
  act(() => {
    renderer = ReactTestRenderer.create(
      <ThemeProvider mode="dark">
        <SafeAreaProvider
          initialMetrics={{
            frame: { x: 0, y: 0, width: 390, height: 844 },
            insets: { top: 0, left: 0, right: 0, bottom: insetsBottom },
          }}
        >
          <BottomNavBar {...props} />
        </SafeAreaProvider>
      </ThemeProvider>,
    );
  });
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

test('Home (active) renders accent, Analytics (inactive) renders textTertiary', () => {
  const renderer = renderBar(buildFakeNavigation(), 0, 0);

  const [homeIcon] = renderer.root.findAllByType(HouseIcon);
  const [analyticsIcon] = renderer.root.findAllByType(BarChartIcon);

  expect(homeIcon.props.color).toBe(darkColors.accent);
  expect(analyticsIcon.props.color).toBe(darkColors.textTertiary);
});

test('tapping the inactive Analytics tab emits tabPress and navigates to it, flipping the tint', () => {
  const navigation = buildFakeNavigation();
  const renderer = renderBar(navigation, 0, 0);

  pressByLabel(renderer, 'Estadístiques');

  expect(navigation.emit).toHaveBeenCalledWith(
    expect.objectContaining({ type: 'tabPress', target: 'analytics-key' }),
  );
  expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.Analytics);

  // Simulates the resulting re-render once `state.index` reflects the new active tab.
  const rerendered = renderBar(navigation, 0, 1);
  const [homeIcon] = rerendered.root.findAllByType(HouseIcon);
  const [analyticsIcon] = rerendered.root.findAllByType(BarChartIcon);
  expect(homeIcon.props.color).toBe(darkColors.textTertiary);
  expect(analyticsIcon.props.color).toBe(darkColors.accent);
});

test('does not navigate when a tabPress listener calls preventDefault', () => {
  const navigation = buildFakeNavigation(true);
  const renderer = renderBar(navigation, 0, 0);

  pressByLabel(renderer, 'Estadístiques');

  expect(navigation.emit).toHaveBeenCalledWith(
    expect.objectContaining({ type: 'tabPress', target: 'analytics-key' }),
  );
  expect(navigation.navigate).not.toHaveBeenCalled();
});

test('bar height grows by the bottom safe-area inset on a notched/dynamic-island device', () => {
  const renderer = renderBar(buildFakeNavigation(), 34, 0);

  const [svg] = renderer.root.findAllByType(Svg);
  expect(svg.props.height).toBe(BAR_HEIGHT + 34);
});

test('bar height has no extra padding on a device with no safe-area inset', () => {
  const renderer = renderBar(buildFakeNavigation(), 0, 0);

  const [svg] = renderer.root.findAllByType(Svg);
  expect(svg.props.height).toBe(BAR_HEIGHT);
});

test('tapping the FAB is a documented no-op: no emit or navigation occurs', () => {
  const navigation = buildFakeNavigation();
  const renderer = renderBar(navigation, 0, 0);

  pressByLabel(renderer, 'Acció ràpida');

  expect(navigation.emit).not.toHaveBeenCalled();
  expect(navigation.navigate).not.toHaveBeenCalled();
});
