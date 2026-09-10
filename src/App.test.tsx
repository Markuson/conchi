/**
 * Covers the I/O & Edge-Case Matrix's "Theme switch"/"Theme restart" rows'
 * mode-resolution logic: a persisted `Theme` value must resolve to the
 * correct `ThemeProvider` `mode` prop (`'system'` → `undefined`, so
 * `ThemeProvider` falls back to the OS scheme; `'dark'`/`'light'` → that
 * forced mode). `resolveThemeProviderMode` is a pure function extracted from
 * `App`'s JSX specifically so this can be checked directly, without needing
 * to mount the full app shell (navigation, safe-area, Conchi Bubble) just to
 * observe a one-line ternary.
 *
 * The pure-function tests below don't prove `App` actually *wires*
 * `useSettingsStore`'s `theme` into it, though — the second block renders the
 * real `App` tree with a seeded store theme and reads the `mode` prop
 * `ThemeProvider` actually received, so the reactive selector → resolver →
 * prop chain is covered end to end, not just the resolver in isolation.
 */
import React from 'react';
import ReactTestRenderer, { act, type ReactTestRenderer as Renderer } from 'react-test-renderer';

import { App, resolveThemeProviderMode } from './App';
import { useSettingsStore } from './store';
import { ThemeProvider } from './theme/ThemeProvider';

test('resolves "system" to undefined, so ThemeProvider derives the OS color scheme', () => {
  expect(resolveThemeProviderMode('system')).toBeUndefined();
});

test('resolves "dark" to a forced "dark" mode', () => {
  expect(resolveThemeProviderMode('dark')).toBe('dark');
});

test('resolves "light" to a forced "light" mode', () => {
  expect(resolveThemeProviderMode('light')).toBe('light');
});

describe('App wires the store theme into ThemeProvider', () => {
  let renderer: Renderer | undefined;

  afterEach(() => {
    if (renderer) {
      act(() => {
        renderer?.unmount();
      });
      renderer = undefined;
    }
    useSettingsStore.setState({ theme: 'system' });
  });

  test.each([
    ['dark', 'dark'],
    ['light', 'light'],
    ['system', undefined],
  ] as const)('a seeded theme of %s renders <ThemeProvider mode=%s>', (seededTheme, expectedMode) => {
    useSettingsStore.setState({ theme: seededTheme });

    act(() => {
      renderer = ReactTestRenderer.create(<App />);
    });

    const themeProviderNode = renderer!.root.findByType(ThemeProvider);
    expect(themeProviderNode.props.mode).toBe(expectedMode);
  });
});
