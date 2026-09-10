/**
 * Minimal render/behavior coverage for `SegmentedControl`, following
 * `Button.test.tsx`'s conventions (`react-test-renderer`, wrapped in a `ThemeProvider`).
 */
import React from 'react';
import ReactTestRenderer, { act, type ReactTestRenderer as Renderer } from 'react-test-renderer';
import { Text } from 'react-native';

import { SegmentedControl, type SegmentedControlProps } from './SegmentedControl';
import { ThemeProvider } from '../../theme/ThemeProvider';

type ThemeOption = 'dark' | 'light' | 'system';

const THEME_OPTIONS: SegmentedControlProps<ThemeOption>['options'] = [
  { label: 'Fosc', value: 'dark' },
  { label: 'Clar', value: 'light' },
  { label: 'Sistema', value: 'system' },
];

function renderSegmentedControl(props: SegmentedControlProps<ThemeOption>): Renderer {
  let renderer!: Renderer;
  act(() => {
    renderer = ReactTestRenderer.create(
      <ThemeProvider mode="dark">
        <SegmentedControl {...props} />
      </ThemeProvider>,
    );
  });
  return renderer;
}

test('renders without throwing', () => {
  expect(() => renderSegmentedControl({ options: THEME_OPTIONS, value: 'system', onChange: () => {} })).not.toThrow();
});

test('renders every option label', () => {
  const renderer = renderSegmentedControl({ options: THEME_OPTIONS, value: 'system', onChange: () => {} });

  for (const option of THEME_OPTIONS) {
    const labelNode = renderer.root.findAllByType(Text).find((node) => node.props.children === option.label);
    expect(labelNode).toBeDefined();
  }
});

test("calls onChange with the pressed option's value", () => {
  const onChange = jest.fn();
  const renderer = renderSegmentedControl({ options: THEME_OPTIONS, value: 'system', onChange });

  const [pressable] = renderer.root.findAll(
    (node) => node.props.accessibilityLabel === 'Fosc' && typeof node.props.onPress === 'function',
  );
  act(() => {
    (pressable.props.onPress as () => void)();
  });

  expect(onChange).toHaveBeenCalledWith('dark');
});

test('marks the currently selected option as accessibilityState.selected', () => {
  const renderer = renderSegmentedControl({ options: THEME_OPTIONS, value: 'light', onChange: () => {} });

  const [selectedPressable] = renderer.root.findAll(
    (node) => node.props.accessibilityLabel === 'Clar' && typeof node.props.onPress === 'function',
  );
  const [unselectedPressable] = renderer.root.findAll(
    (node) => node.props.accessibilityLabel === 'Fosc' && typeof node.props.onPress === 'function',
  );

  expect(selectedPressable.props.accessibilityState).toEqual({ selected: true });
  expect(unselectedPressable.props.accessibilityState).toEqual({ selected: false });
});
