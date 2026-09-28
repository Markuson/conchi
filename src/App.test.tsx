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
 *
 * The third block covers Story 2.1's startup FCM wiring end to end: with a
 * `webhookUrl` and secret seeded, mounting the real `App` must call
 * `getFcmToken()`, then `registerFcmToken(token, webhookUrl, secret)` with
 * those three values in that exact order/position. `fcmClient.test.ts` only
 * calls `registerFcmToken` directly with its own literal args, which
 * wouldn't catch a transposition bug at the `App.tsx` call site (all three
 * params are `string`, so a swap still compiles) — this test mocks
 * `./lib/fcm` instead of the real client so it can assert exactly what
 * `App.tsx` passes through.
 */
import React from 'react';
import ReactTestRenderer, { act, type ReactTestRenderer as Renderer } from 'react-test-renderer';

import { App, resolveThemeProviderMode } from './App';
import { fetchReferenceData } from './features/settings/referenceDataFetch';
import { getFcmToken, onForegroundMessage, registerFcmToken } from './lib/fcm';
import { AUTH_SECRET_KEY, deleteSecureItem, writeSecureItem } from './lib/storage/secureStore';
import { useSettingsStore } from './store';
import { ThemeProvider } from './theme/ThemeProvider';

jest.mock('./lib/fcm', () => ({
  getFcmToken: jest.fn(),
  registerFcmToken: jest.fn(),
  // Every test in this file mounts <App/>, which always runs the FCM
  // effect — a bare `jest.fn()` here (returning `undefined`) would throw
  // when `App.tsx` calls `subscription.remove()` on cleanup for every test
  // that doesn't explicitly configure this mock itself.
  onForegroundMessage: jest.fn(() => ({ remove: jest.fn() })),
}));

// Every test in this file mounts <App/>, which now also runs the Story 2.2
// reference-data fetch effect. Left un-mocked, a test that seeds a real
// webhookUrl (the FCM describe block below) would trigger a real network
// call via the real `postToN8n`/`fetch`, plus a real 5s retry `setTimeout`
// on its failure — neither of which any test in this file cares about or
// cleans up.
jest.mock('./features/settings/referenceDataFetch', () => ({
  fetchReferenceData: jest.fn().mockResolvedValue(undefined),
}));

const mockFetchReferenceData = fetchReferenceData as jest.MockedFunction<typeof fetchReferenceData>;

const mockGetFcmToken = getFcmToken as jest.MockedFunction<typeof getFcmToken>;
const mockRegisterFcmToken = registerFcmToken as jest.MockedFunction<typeof registerFcmToken>;
const mockOnForegroundMessage = onForegroundMessage as jest.MockedFunction<typeof onForegroundMessage>;

/**
 * Advances the microtask queue enough turns for the FCM effect's `await`
 * chain (`readSecureItem` → `getFcmToken` → `registerFcmToken`) to settle.
 * None of that chain triggers a React state update, so `act`'s own
 * "flush pending work" doesn't wait for it — this stands in for that.
 */
async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 10; i += 1) {
    await Promise.resolve();
  }
}

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

describe('App wires FCM startup registration (Story 2.1)', () => {
  let renderer: Renderer | undefined;

  beforeEach(async () => {
    mockGetFcmToken.mockReset();
    mockRegisterFcmToken.mockReset();
    mockOnForegroundMessage.mockReset();
    mockOnForegroundMessage.mockReturnValue({ remove: jest.fn() });
    mockFetchReferenceData.mockClear();
    mockFetchReferenceData.mockResolvedValue(undefined);

    useSettingsStore.setState({ webhookUrl: 'https://n8n.example.com' });
    await writeSecureItem(AUTH_SECRET_KEY, 'secret-value');
  });

  afterEach(async () => {
    if (renderer) {
      act(() => {
        renderer?.unmount();
      });
      renderer = undefined;
    }
    useSettingsStore.setState({ webhookUrl: '', theme: 'system' });
    await deleteSecureItem(AUTH_SECRET_KEY);
  });

  test('fetches and registers the FCM token against the configured webhook + secret, then attaches the foreground listener', async () => {
    mockGetFcmToken.mockResolvedValue('device-token-abc');
    mockRegisterFcmToken.mockResolvedValue({ ok: true } as Response);

    await act(async () => {
      renderer = ReactTestRenderer.create(<App />);
      await flushMicrotasks();
    });

    expect(mockGetFcmToken).toHaveBeenCalledTimes(1);
    expect(mockRegisterFcmToken).toHaveBeenCalledWith('device-token-abc', 'https://n8n.example.com', 'secret-value');
    expect(mockOnForegroundMessage).toHaveBeenCalledTimes(1);
    // Story 2.2: the startup effect also kicks off the reference-data fetch,
    // independently of the FCM flow above.
    expect(mockFetchReferenceData).toHaveBeenCalledTimes(1);
  });

  test('skips registration when getFcmToken resolves null (e.g. permission denied)', async () => {
    mockGetFcmToken.mockResolvedValue(null);

    await act(async () => {
      renderer = ReactTestRenderer.create(<App />);
      await flushMicrotasks();
    });

    expect(mockGetFcmToken).toHaveBeenCalledTimes(1);
    expect(mockRegisterFcmToken).not.toHaveBeenCalled();
  });

  test('skips fetching a token entirely when not configured (no webhookUrl)', async () => {
    useSettingsStore.setState({ webhookUrl: '' });

    await act(async () => {
      renderer = ReactTestRenderer.create(<App />);
      await flushMicrotasks();
    });

    expect(mockGetFcmToken).not.toHaveBeenCalled();
    expect(mockRegisterFcmToken).not.toHaveBeenCalled();
  });
});
