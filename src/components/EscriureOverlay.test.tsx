/**
 * Covers the I/O & Edge-Case Matrix rows owned by this file: "Blank submit"
 * (inline validation, `onSubmit` never called), "Phase 1 in flight" (loading
 * indicator while `status === 'submitting'`, input disabled), and "Phase 1
 * failure" (error text + retry affordance shown, typed text untouched — this
 * component never clears `text` itself). Presentational only — all props
 * are plain callbacks/values, no store/feature mocking needed. Uses
 * `react-test-renderer` + a manual `ThemeProvider` wrap (this component calls
 * `useTheme()`), mirroring `ConfirmationCard.test.tsx`'s conventions.
 */
import React from 'react';
import ReactTestRenderer, { act, type ReactTestRenderer as Renderer } from 'react-test-renderer';
import { ActivityIndicator, Text, TextInput } from 'react-native';

import { EscriureOverlay, type EscriureOverlayProps } from './EscriureOverlay';
import { Button, type ButtonProps } from './atoms/Button';
import { ThemeProvider } from '../theme/ThemeProvider';

function renderOverlay(overrides: Partial<EscriureOverlayProps> = {}): Renderer {
  const props: EscriureOverlayProps = {
    visible: true,
    text: '',
    onChangeText: jest.fn(),
    status: 'idle',
    errorMessage: undefined,
    onSubmit: jest.fn(),
    onRetry: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };

  let renderer!: Renderer;
  act(() => {
    renderer = ReactTestRenderer.create(
      <ThemeProvider mode="dark">
        <EscriureOverlay {...props} />
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
  act(() => {
    (node.props.onPress as () => void)();
  });
}

function textShown(renderer: Renderer, text: string): boolean {
  return renderer.root.findAllByType(Text).some((node) => node.props.children === text);
}

function findButtonProps(renderer: Renderer, label: string): ButtonProps {
  const button = renderer.root
    .findAllByType(Button)
    .find((node) => (node.props as ButtonProps).label === label);
  if (!button) {
    throw new Error(`No Button found with label "${label}"`);
  }
  return button.props as ButtonProps;
}

/** `Button` (unlike the raw `Pressable`s this file also renders) has no `accessibilityLabel` — it's located by its visible `label` prop instead. */
function pressButton(renderer: Renderer, label: string): void {
  act(() => {
    findButtonProps(renderer, label).onPress();
  });
}

test('renders nothing (Modal is not shown) when visible is false', () => {
  const renderer = renderOverlay({ visible: false });

  expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
});

test('empty submit: shows inline validation and never calls onSubmit', () => {
  const onSubmit = jest.fn();
  const renderer = renderOverlay({ text: '', onSubmit });

  pressButton(renderer, 'Envia');

  expect(onSubmit).not.toHaveBeenCalled();
  expect(textShown(renderer, "Escriu un text abans d'enviar.")).toBe(true);
});

test('whitespace-only submit: shows inline validation and never calls onSubmit', () => {
  const onSubmit = jest.fn();
  const renderer = renderOverlay({ text: '   ', onSubmit });

  pressButton(renderer, 'Envia');

  expect(onSubmit).not.toHaveBeenCalled();
  expect(textShown(renderer, "Escriu un text abans d'enviar.")).toBe(true);
});

test('non-empty submit: clears validation and calls onSubmit', () => {
  const onSubmit = jest.fn();
  const renderer = renderOverlay({ text: 'hola conchi', onSubmit });

  pressButton(renderer, 'Envia');

  expect(onSubmit).toHaveBeenCalledTimes(1);
  expect(textShown(renderer, "Escriu un text abans d'enviar.")).toBe(false);
});

test('shows a loading indicator while submitting, and disables the input and submit button', () => {
  const renderer = renderOverlay({ status: 'submitting' });

  expect(renderer.root.findAllByType(ActivityIndicator)).toHaveLength(1);
  const [input] = renderer.root.findAllByType(TextInput);
  expect(input.props.editable).toBe(false);
  expect(findButtonProps(renderer, 'Envia').disabled).toBe(true);
});

test('shows no loading indicator or error while idle/waiting/ready', () => {
  const renderer = renderOverlay({ status: 'waiting' });
  expect(renderer.root.findAllByType(ActivityIndicator)).toHaveLength(0);
});

test('error: shows the error message, a retry affordance, and keeps the typed text', () => {
  const renderer = renderOverlay({
    text: 'hola conchi',
    status: 'error',
    errorMessage: 'El servidor ha retornat un error (500).',
  });

  expect(textShown(renderer, 'El servidor ha retornat un error (500).')).toBe(true);
  expect(textShown(renderer, 'Torna-ho a provar')).toBe(true);
  const [input] = renderer.root.findAllByType(TextInput);
  expect(input.props.value).toBe('hola conchi');
});

test('retry button fires onRetry', () => {
  const onRetry = jest.fn();
  const renderer = renderOverlay({ status: 'error', errorMessage: 'oops', onRetry });

  pressButton(renderer, 'Torna-ho a provar');

  expect(onRetry).toHaveBeenCalledTimes(1);
});

test('typing clears any prior inline validation message', () => {
  const onChangeText = jest.fn();
  const renderer = renderOverlay({ text: '', onChangeText });
  pressButton(renderer, 'Envia');
  expect(textShown(renderer, "Escriu un text abans d'enviar.")).toBe(true);

  const [input] = renderer.root.findAllByType(TextInput);
  act(() => {
    (input.props.onChangeText as (text: string) => void)('h');
  });

  expect(textShown(renderer, "Escriu un text abans d'enviar.")).toBe(false);
  expect(onChangeText).toHaveBeenCalledWith('h');
});

test('closing invokes onClose', () => {
  const onClose = jest.fn();
  const renderer = renderOverlay({ onClose });

  pressByLabel(renderer, 'Tanca');

  expect(onClose).toHaveBeenCalledTimes(1);
});
