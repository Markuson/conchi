/**
 * Minimal render/behavior coverage for `TextField`, following `Button.test.tsx`'s
 * conventions (`react-test-renderer`, wrapped in a `ThemeProvider`).
 */
import React from 'react';
import ReactTestRenderer, { act, type ReactTestRenderer as Renderer } from 'react-test-renderer';
import { Text, TextInput } from 'react-native';

import { TextField, type TextFieldProps } from './TextField';
import { ThemeProvider } from '../../theme/ThemeProvider';

function renderTextField(props: TextFieldProps): Renderer {
  let renderer!: Renderer;
  act(() => {
    renderer = ReactTestRenderer.create(
      <ThemeProvider mode="dark">
        <TextField {...props} />
      </ThemeProvider>,
    );
  });
  return renderer;
}

test('renders without throwing', () => {
  expect(() => renderTextField({ label: 'URL del webhook', value: '', onChangeText: () => {} })).not.toThrow();
});

test('renders the label text', () => {
  const renderer = renderTextField({ label: 'URL del webhook', value: '', onChangeText: () => {} });

  const labelNode = renderer.root.findAllByType(Text).find((node) => node.props.children === 'URL del webhook');
  expect(labelNode).toBeDefined();
});

test('calls onChangeText with the typed value', () => {
  const onChangeText = jest.fn();
  const renderer = renderTextField({ label: 'URL del webhook', value: '', onChangeText });

  const input = renderer.root.findByType(TextInput);
  const handleChangeText = input.props.onChangeText as (text: string) => void;
  act(() => {
    handleChangeText('https://example.com');
  });

  expect(onChangeText).toHaveBeenCalledWith('https://example.com');
});

test('passes secureTextEntry through to the underlying input', () => {
  const renderer = renderTextField({ label: 'Secret', value: '', onChangeText: () => {}, secureTextEntry: true });

  expect(renderer.root.findByType(TextInput).props.secureTextEntry).toBe(true);
});

test('does not render secureTextEntry by default', () => {
  const renderer = renderTextField({ label: 'URL del webhook', value: '', onChangeText: () => {} });

  expect(renderer.root.findByType(TextInput).props.secureTextEntry).toBe(false);
});

test('shows the error text when the error prop is set', () => {
  const renderer = renderTextField({ label: 'URL del webhook', value: '', onChangeText: () => {}, error: 'URL no vàlida' });

  const errorNode = renderer.root.findAllByType(Text).find((node) => node.props.children === 'URL no vàlida');
  expect(errorNode).toBeDefined();
});

test('renders no error text when the error prop is absent', () => {
  const renderer = renderTextField({ label: 'URL del webhook', value: '', onChangeText: () => {} });

  const errorNode = renderer.root.findAllByType(Text).find((node) => node.props.children === 'URL no vàlida');
  expect(errorNode).toBeUndefined();
});

test('is editable by default', () => {
  const renderer = renderTextField({ label: 'URL del webhook', value: '', onChangeText: () => {} });

  expect(renderer.root.findByType(TextInput).props.editable).toBe(true);
});

test('becomes non-editable when disabled is true', () => {
  const renderer = renderTextField({ label: 'URL del webhook', value: '', onChangeText: () => {}, disabled: true });

  const input = renderer.root.findByType(TextInput);
  expect(input.props.editable).toBe(false);
  expect(input.props.accessibilityState).toEqual({ disabled: true });
});
