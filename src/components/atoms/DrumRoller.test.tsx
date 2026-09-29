/**
 * Minimal render/behavior coverage for `DrumRoller`, following `Button.test.tsx`'s
 * conventions (`react-test-renderer`, wrapped in a `ThemeProvider`).
 */
import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer, {
  act,
  type ReactTestRenderer as Renderer,
} from 'react-test-renderer';

import { DrumRoller, type DrumRollerProps } from './DrumRoller';
import { ThemeProvider } from '../../theme/ThemeProvider';

const OPTIONS = [
  { label: 'Alimentació', value: 'food' },
  { label: 'Transport', value: 'transport' },
  { label: 'Oci', value: 'leisure' },
];

function renderDrumRoller(props: DrumRollerProps<string>): Renderer {
  let renderer!: Renderer;
  act(() => {
    renderer = ReactTestRenderer.create(
      <ThemeProvider mode="dark">
        <DrumRoller {...props} />
      </ThemeProvider>,
    );
  });
  return renderer;
}

/**
 * Locates a `Pressable` by its `accessibilityLabel` prop via a structural
 * predicate rather than `findAllByType(Pressable)` — this pnpm layout
 * resolves two distinct `react-native` module instances, so the `Pressable`
 * imported here doesn't reference-match the one rendered inside the
 * component under test (mirrors `Button.test.tsx`'s own reasoning for
 * avoiding a direct type/prop lookup on `Pressable`).
 */
function pressByLabel(renderer: Renderer, label: string): void {
  const pressable = renderer.root.findAll(
    node =>
      node.props.accessibilityLabel === label &&
      typeof node.props.onPress === 'function',
  )[0];
  if (!pressable) {
    throw new Error(`No Pressable found with accessibilityLabel "${label}"`);
  }
  act(() => {
    (pressable.props.onPress as () => void)();
  });
}

test('renders without throwing', () => {
  expect(() =>
    renderDrumRoller({
      label: 'Categoria',
      options: OPTIONS,
      selected: 'food',
      onChange: () => {},
    }),
  ).not.toThrow();
});

test('renders the label and the current selection', () => {
  const renderer = renderDrumRoller({
    label: 'Categoria',
    options: OPTIONS,
    selected: 'transport',
    onChange: () => {},
  });

  expect(
    renderer.root
      .findAllByType(Text)
      .some(node => node.props.children === 'Categoria'),
  ).toBe(true);
  expect(
    renderer.root
      .findAllByType(Text)
      .some(node => node.props.children === 'Transport'),
  ).toBe(true);
});

test('options are hidden until the trigger is tapped, then shown', () => {
  const renderer = renderDrumRoller({
    label: 'Categoria',
    options: OPTIONS,
    selected: 'food',
    onChange: () => {},
  });

  expect(
    renderer.root
      .findAllByType(Text)
      .some(node => node.props.children === 'Oci'),
  ).toBe(false);

  pressByLabel(renderer, 'Categoria');

  expect(
    renderer.root
      .findAllByType(Text)
      .some(node => node.props.children === 'Oci'),
  ).toBe(true);
});

test('selecting an option fires onChange and closes the list', () => {
  const onChange = jest.fn();
  const renderer = renderDrumRoller({
    label: 'Categoria',
    options: OPTIONS,
    selected: 'food',
    onChange,
  });

  pressByLabel(renderer, 'Categoria');
  pressByLabel(renderer, 'Oci');

  expect(onChange).toHaveBeenCalledWith('leisure');
  // The list itself has closed — 'Transport', an option that's neither the
  // original nor the newly-tapped selection, only ever renders while open.
  expect(
    renderer.root
      .findAllByType(Text)
      .some(node => node.props.children === 'Transport'),
  ).toBe(false);
});

test('renders a warning icon when warning is true', () => {
  const renderer = renderDrumRoller({
    label: 'Categoria',
    options: OPTIONS,
    selected: 'food',
    onChange: () => {},
    warning: true,
  });

  expect(
    renderer.root
      .findAllByType(Text)
      .some(
        node =>
          typeof node.props.children === 'string' &&
          node.props.children.includes('⚠️'),
      ),
  ).toBe(true);
});
