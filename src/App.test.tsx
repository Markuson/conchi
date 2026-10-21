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
import { TextInput } from 'react-native';
import ReactTestRenderer, { act, type ReactTestRenderer as Renderer } from 'react-test-renderer';

import { App, resolveBubbleState, resolveThemeProviderMode } from './App';
import { Button, type ButtonProps } from './components/atoms/Button';
import { ConchiBubble } from './components/ConchiBubble';
import { fetchReferenceData } from './features/settings/referenceDataFetch';
import { postToN8n } from './lib/api/n8nClient';
import { getFcmToken, onForegroundMessage, registerFcmToken } from './lib/fcm';
import type { FcmDataPayload } from './lib/fcm/types';
import { AUTH_SECRET_KEY, deleteSecureItem, writeSecureItem } from './lib/storage/secureStore';
import type { Entry } from './lib/types/entry';
import { useSettingsStore } from './store';
import { ThemeProvider } from './theme/ThemeProvider';

// The real `SafeAreaProvider` (mounted by `App.tsx`'s `AppShell`, with no
// `initialMetrics` override available from the outside) never resolves its
// native-module-driven insets under Jest and renders `null` children forever
// — the reason every *other* describe block in this file only proves `App`
// doesn't throw, never that anything under it actually mounts (see
// `ConchiBubble.test.tsx`'s own docstring for the same observation). The
// library ships an official Jest mock for exactly this; only the describe
// block at the bottom of this file (which needs the real rendered tree)
// relies on it.
jest.mock('react-native-safe-area-context', () => {
  // The shipped mock is Babel-compiled ESM (`exports.default = {...}`) — a
  // bare `require(...)` factory return nests everything under `.default`,
  // which named imports elsewhere (`{ SafeAreaProvider }`, `useSafeAreaInsets`)
  // can't see. Unwrapping `.default` here gives Babel's interop the flat
  // named-export shape it expects.
  return jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default;
});

jest.mock('./lib/fcm', () => ({
  getFcmToken: jest.fn(),
  registerFcmToken: jest.fn(),
  // Every test in this file mounts <App/>, which always runs the FCM
  // effect — a bare `jest.fn()` here (returning `undefined`) would throw
  // when `App.tsx` calls `subscription.remove()` on cleanup for every test
  // that doesn't explicitly configure this mock itself.
  onForegroundMessage: jest.fn(() => ({ remove: jest.fn() })),
}));

// Only the save/send networking boundary is mocked here — `App.tsx`'s own
// FCM dispatch wiring (the subject of the describe block at the bottom of
// this file) must stay real, unlike the other describe blocks above which
// mock `./lib/fcm` wholesale.
jest.mock('./lib/api/n8nClient', () => ({
  ...jest.requireActual<typeof import('./lib/api/n8nClient')>('./lib/api/n8nClient'),
  postToN8n: jest.fn(),
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
const mockPostToN8n = postToN8n as jest.MockedFunction<typeof postToN8n>;

const MOCK_ENTRY: Entry = {
  id: 'entry-1',
  userId: 'user-1',
  amount: 24.5,
  currency: 'EUR',
  category: 'Alimentació',
  subcategory: 'Supermercat',
  description: 'Cafè',
  date: '2026-10-15',
  origin: 'app',
};

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

/**
 * Covers Story 2.4's I/O & Edge-Case Matrix Bubble-state rows:
 * "Phase 1 in flight" (Bubble stays Idle), "Phase 1 success"/"Phase 2
 * result" (Bubble → Working / back to Idle), and "Phase 1 failure"/"Phase 2
 * timeout" (Bubble → Error). `resolveBubbleState` is a pure function
 * extracted from `App`'s JSX for exactly this, per its own doc comment.
 */
test('"idle" and "submitting" (Phase 1 in flight) both resolve to Idle', () => {
  expect(resolveBubbleState('idle')).toBe('idle');
  expect(resolveBubbleState('submitting')).toBe('idle');
});

test('"waiting" (Phase 2 active) resolves to Working', () => {
  expect(resolveBubbleState('waiting')).toBe('working');
});

test('"error" (Phase 1 failure or Phase 2 timeout) resolves to Error', () => {
  expect(resolveBubbleState('error')).toBe('error');
});

test('"ready" (a result just arrived, ConfirmationCard takes over) resolves to Idle', () => {
  expect(resolveBubbleState('ready')).toBe('idle');
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

/**
 * Covers Story 2.4's "first real dispatch wiring" integration point:
 * `App.tsx`'s `onForegroundMessage` callback branching on
 * `payload.type === 'round_trip_result'` and forwarding `payload.entry` into
 * `useEntrySubmission`'s `handleRoundTripResult`, and `resolveBubbleState`'s
 * output actually reaching the mounted `ConchiBubble`'s `state` prop.
 *
 * Unlike `navigation/index.test.tsx`'s own round-trip tests — which drive
 * `handleRoundTripResult` directly via a captured ref, explicitly standing
 * in for this wiring — this suite mounts the real `<App/>` and fires the
 * FCM result through the actual callback `onForegroundMessage` was
 * subscribed with, so a regression in the `payload.type` branch or the
 * `resolveBubbleState(entrySubmission.status)` prop wiring would be caught
 * here even though neither of those is exercised anywhere else.
 */
describe('App wires the real FCM round-trip result into ConfirmationCard and ConchiBubble (Story 2.4)', () => {
  let renderer: Renderer | undefined;

  function pressByLabel(label: string): void {
    const [node] = renderer!.root.findAll(
      (n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function',
    );
    if (!node) {
      throw new Error(`No pressable found with accessibilityLabel "${label}"`);
    }
    act(() => {
      (node.props.onPress as () => void)();
    });
  }

  function pressButton(label: string): void {
    const button = renderer!.root.findAllByType(Button).find((n) => (n.props as ButtonProps).label === label);
    if (!button) {
      throw new Error(`No Button found with label "${label}"`);
    }
    act(() => {
      (button.props as ButtonProps).onPress();
    });
  }

  beforeEach(async () => {
    mockPostToN8n.mockReset();
    mockOnForegroundMessage.mockReset();
    mockOnForegroundMessage.mockReturnValue({ remove: jest.fn() });
    // No FCM token registration noise for this suite — it's covered by its
    // own describe block above; here only the foreground-message callback
    // itself matters.
    mockGetFcmToken.mockReset();
    mockGetFcmToken.mockResolvedValue(null);
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

  test('a round_trip_result delivered through the real subscribed callback mounts ConfirmationCard and flips the Bubble to Working then back to Idle', async () => {
    mockPostToN8n.mockResolvedValue({ ok: true } as Response);

    await act(async () => {
      renderer = ReactTestRenderer.create(<App />);
      await flushMicrotasks();
    });

    expect(renderer!.root.findByType(ConchiBubble).props.state).toBe('idle');

    // Drive a real Phase 1 submission through the FAB, same as
    // `navigation/index.test.tsx`, so the hook is actually `'waiting'` when
    // the FCM result below arrives (`handleRoundTripResult` is a no-op
    // otherwise).
    pressByLabel('Acció ràpida');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const [input] = renderer!.root.findAllByType(TextInput);
    act(() => {
      (input.props.onChangeText as (text: string) => void)('cafè 2,50');
    });
    pressButton('Envia');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(renderer!.root.findByType(ConchiBubble).props.state).toBe('working');

    const fcmCallback = mockOnForegroundMessage.mock.calls[0]?.[0];
    expect(fcmCallback).toBeDefined();

    act(() => {
      fcmCallback?.({ type: 'round_trip_result', entryId: 'entry-1', entry: MOCK_ENTRY } satisfies FcmDataPayload);
    });

    expect(renderer!.root.findByType(ConchiBubble).props.state).toBe('idle');
    expect(renderer!.root.findAllByType(Button).some((n) => (n.props as ButtonProps).label === 'Acceptar')).toBe(
      true,
    );
  });

  test('a non-round_trip_result payload delivered through the real callback is not dispatched into the hook', async () => {
    mockPostToN8n.mockResolvedValue({ ok: true } as Response);

    await act(async () => {
      renderer = ReactTestRenderer.create(<App />);
      await flushMicrotasks();
    });

    pressByLabel('Acció ràpida');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const [input] = renderer!.root.findAllByType(TextInput);
    act(() => {
      (input.props.onChangeText as (text: string) => void)('cafè 2,50');
    });
    pressButton('Envia');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(renderer!.root.findByType(ConchiBubble).props.state).toBe('working');

    const fcmCallback = mockOnForegroundMessage.mock.calls[0]?.[0];
    act(() => {
      fcmCallback?.({
        type: 'invoice_unknown',
        entryId: 'entry-1',
        senderName: 'Someone',
      } satisfies FcmDataPayload);
    });

    // Untouched: still "waiting" (Working), no card mounted.
    expect(renderer!.root.findByType(ConchiBubble).props.state).toBe('working');
    expect(renderer!.root.findAllByType(Button).some((n) => (n.props as ButtonProps).label === 'Acceptar')).toBe(
      false,
    );
  });
});
