/**
 * Covers the I/O & Edge-Case Matrix rows owned by this file: "Empty submit"
 * (inline validation, `onSubmit` never called), "Happy path" (loading
 * indicator while `status === 'submitting'`), "HTTP error"/"Network failure"
 * (error text shown, typed text untouched — this component never clears
 * `text` itself), and the raw response display. Presentational only — all
 * props are plain callbacks/values, no store/feature mocking needed. Uses
 * `react-test-renderer`, this repo's existing convention (see
 * `atoms/Button.test.tsx`).
 */
import React from 'react';
import ReactTestRenderer, { act, type ReactTestRenderer as Renderer } from 'react-test-renderer';
import { ActivityIndicator, Text, TextInput } from 'react-native';

import { TracerBulletModal, type TracerBulletModalProps } from './TracerBulletModal';

function renderModal(overrides: Partial<TracerBulletModalProps> = {}): Renderer {
  const props: TracerBulletModalProps = {
    visible: true,
    text: '',
    onChangeText: jest.fn(),
    status: 'idle',
    responseText: undefined,
    errorMessage: undefined,
    onSubmit: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };

  let renderer!: Renderer;
  act(() => {
    renderer = ReactTestRenderer.create(<TracerBulletModal {...props} />);
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

test('renders nothing (Modal is not shown) when visible is false', () => {
  const renderer = renderModal({ visible: false });

  expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
});

test('empty submit: shows inline validation and never calls onSubmit', () => {
  const onSubmit = jest.fn();
  const renderer = renderModal({ text: '', onSubmit });

  pressByLabel(renderer, 'Envia');

  expect(onSubmit).not.toHaveBeenCalled();
  expect(textShown(renderer, "Escriu un text abans d'enviar.")).toBe(true);
});

test('whitespace-only submit: shows inline validation and never calls onSubmit', () => {
  const onSubmit = jest.fn();
  const renderer = renderModal({ text: '   ', onSubmit });

  pressByLabel(renderer, 'Envia');

  expect(onSubmit).not.toHaveBeenCalled();
  expect(textShown(renderer, "Escriu un text abans d'enviar.")).toBe(true);
});

test('non-empty submit: clears validation and calls onSubmit', () => {
  const onSubmit = jest.fn();
  const renderer = renderModal({ text: 'hola conchi', onSubmit });

  pressByLabel(renderer, 'Envia');

  expect(onSubmit).toHaveBeenCalledTimes(1);
  expect(textShown(renderer, "Escriu un text abans d'enviar.")).toBe(false);
});

test('shows a loading indicator while submitting, and disables the input', () => {
  const renderer = renderModal({ status: 'submitting' });

  expect(renderer.root.findAllByType(ActivityIndicator)).toHaveLength(1);
  const [input] = renderer.root.findAllByType(TextInput);
  expect(input.props.editable).toBe(false);
});

test('shows the plain error message on an HTTP/network error, and keeps the typed text', () => {
  const renderer = renderModal({
    text: 'hola conchi',
    status: 'error',
    errorMessage: 'El servidor ha retornat un error (500).',
  });

  expect(textShown(renderer, 'El servidor ha retornat un error (500).')).toBe(true);
  const [input] = renderer.root.findAllByType(TextInput);
  expect(input.props.value).toBe('hola conchi');
});

test('shows the raw response text on success', () => {
  const renderer = renderModal({ status: 'success', responseText: 'pong' });

  expect(textShown(renderer, 'pong')).toBe(true);
});

test('typing clears any prior inline validation message', () => {
  const onChangeText = jest.fn();
  const renderer = renderModal({ text: '', onChangeText });
  pressByLabel(renderer, 'Envia');
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
  const renderer = renderModal({ onClose });

  pressByLabel(renderer, 'Tanca');

  expect(onClose).toHaveBeenCalledTimes(1);
});
