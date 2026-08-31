/**
 * Minimal render/behavior coverage for `Button`, the app's first reusable
 * component. Uses `react-test-renderer` (this repo's existing convention, see
 * `__tests__/App.test.tsx`) rather than `@testing-library/react-native`, which
 * isn't a dependency here.
 */
import React from 'react';
import ReactTestRenderer, { act, type ReactTestRenderer as Renderer } from 'react-test-renderer';

import { Button, type ButtonProps, type ButtonVariant } from './Button';
import { ThemeProvider } from '../../theme/ThemeProvider';

function renderButton(props: ButtonProps): Renderer {
  let renderer!: Renderer;
  act(() => {
    renderer = ReactTestRenderer.create(
      <ThemeProvider mode="dark">
        <Button {...props} />
      </ThemeProvider>,
    );
  });
  return renderer;
}

const VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'danger'];

test.each(VARIANTS)('renders the %s variant without throwing', (variant) => {
  expect(() => renderButton({ variant, label: 'Test', onPress: () => {} })).not.toThrow();
});

/**
 * `usePressability` (inside `Pressable`) spreads its responder handlers onto the
 * underlying host node, not onto `Pressable`'s own composite instance — so the
 * handler has to be located by predicate rather than by the props we passed in.
 */
function findStartShouldSetResponder(renderer: Renderer): () => boolean {
  const [host] = renderer.root.findAll((node) => typeof node.props.onStartShouldSetResponder === 'function');
  if (!host) {
    throw new Error('No node with onStartShouldSetResponder found — Pressable internals may have changed.');
  }
  return host.props.onStartShouldSetResponder as () => boolean;
}

test('does not allow a press to start when disabled', () => {
  const onPress = jest.fn();
  const renderer = renderButton({ variant: 'primary', label: 'Test', onPress, disabled: true });

  // This is the exact gate react-native's Pressability uses to decide whether a
  // touch is even allowed to begin
  // (node_modules/react-native/Libraries/Pressability/Pressability.js: `return
  // !disabled`). When it's false, no touch sequence can ever start, so
  // `onPress` structurally can never fire.
  expect(findStartShouldSetResponder(renderer)()).toBe(false);
  expect(onPress).not.toHaveBeenCalled();
});

test('allows a press to start when enabled', () => {
  const renderer = renderButton({ variant: 'primary', label: 'Test', onPress: () => {} });

  expect(findStartShouldSetResponder(renderer)()).toBe(true);
});
