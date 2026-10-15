/**
 * App-shell test proving Story 2.4's end-to-end causal chain: FAB tap while
 * unconfigured shows an `Alert` whose only action navigates to Settings; FAB
 * tap while configured opens the real `EscriureOverlay` (replacing Story
 * 1.6's tracer-bullet modal), a successful Phase 1 POST closes the overlay,
 * and feeding the hook a round-trip result (standing in for `App.tsx`'s real
 * FCM dispatch — out of this file's scope) mounts `ConfirmationCard`
 * pre-filled, whose Acceptar POSTs the save request and dismisses the card.
 *
 * `RootNavigator` now takes an `entrySubmission` prop (Story 2.4) owned, in
 * production, by `App.tsx`'s single `useEntrySubmission()` call. This file
 * mounts the REAL hook via a small `Harness` wrapper (capturing it into a
 * ref, the same mechanism `useTracerBullet.test.ts` uses) rather than a stub,
 * so the full wiring — not just each piece in isolation — is exercised here.
 *
 * Only `postToN8n` (the actual network boundary) is mocked; the settings
 * store and secure-storage read/write go through mocked replacements for
 * `../store` and `../lib/storage/secureStore` (kept out of a static `import`
 * here since `src/navigation/index.test.tsx` is not on the
 * `no-restricted-imports` override list — only `src/navigation/index.tsx`
 * itself is).
 *
 * Builds the same tree `App.tsx` mounts (`ThemeProvider` -> `SafeAreaProvider`
 * -> `NavigationContainer` -> `RootNavigator`), following
 * `ConchiBubble.test.tsx`'s `renderAppShell` convention.
 */
import React from 'react';
import { Alert, Text, TextInput } from 'react-native';
import ReactTestRenderer, { act, type ReactTestRenderer as Renderer } from 'react-test-renderer';
import { createNavigationContainerRef, NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const MOCK_CATEGORIES = [{ name: 'Alimentació', subcategories: ['Supermercat'] }];
const MOCK_CONTEXTS: string[] = [];

const mockSettingsState = {
  webhookUrl: '',
  theme: 'system' as const,
  setWebhookUrl: jest.fn(),
  setTheme: jest.fn(),
};

function mockUseSettingsStore<T>(selector: (state: typeof mockSettingsState) => T): T {
  return selector(mockSettingsState);
}
mockUseSettingsStore.getState = (): typeof mockSettingsState => mockSettingsState;

function mockUseReferenceDataStore(): { categories: typeof MOCK_CATEGORIES; contexts: typeof MOCK_CONTEXTS } {
  return { categories: MOCK_CATEGORIES, contexts: MOCK_CONTEXTS };
}

jest.mock('../store', () => ({
  useSettingsStore: mockUseSettingsStore,
  useReferenceDataStore: mockUseReferenceDataStore,
}));

jest.mock('../lib/api/n8nClient', () => ({
  ...jest.requireActual<typeof import('../lib/api/n8nClient')>('../lib/api/n8nClient'),
  postToN8n: jest.fn(),
}));

jest.mock('../lib/storage/secureStore', () => ({
  AUTH_SECRET_KEY: 'settings.authSecret',
  readSecureItem: jest.fn(),
}));

import { postToN8n } from '../lib/api/n8nClient';
import { readSecureItem } from '../lib/storage/secureStore';
import { RootNavigator } from './index';
import { Button, type ButtonProps } from '../components/atoms/Button';
import { ThemeProvider } from '../theme/ThemeProvider';
import { useEntrySubmission, type UseEntrySubmissionResult } from '../features/entry/useEntrySubmission';
import type { Entry } from '../lib/types/entry';

const mockPostToN8n = postToN8n as jest.MockedFunction<typeof postToN8n>;
const mockReadSecureItem = readSecureItem as jest.MockedFunction<typeof readSecureItem>;

const navigationRef = createNavigationContainerRef();

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

// Same reasoning as `ConchiBubble.test.tsx`: `BottomTabView` schedules a
// `setTimeout` on focus change cleared only on unmount, so every renderer
// created in a test is tracked and unmounted to avoid a stray post-teardown
// timer firing outside `act()`.
let activeRenderer: Renderer | undefined;

beforeEach(() => {
  mockSettingsState.webhookUrl = '';
  mockPostToN8n.mockReset();
  mockReadSecureItem.mockReset();
});

afterEach(() => {
  if (activeRenderer) {
    act(() => {
      activeRenderer?.unmount();
    });
    activeRenderer = undefined;
  }
});

/** Captures the real `useEntrySubmission()` hook into `entryRef` so tests can drive Phase 2 directly (standing in for `App.tsx`'s real FCM dispatch). */
function Harness({
  entryRef,
}: {
  entryRef: { current: UseEntrySubmissionResult | undefined };
}): React.JSX.Element {
  const entrySubmission = useEntrySubmission();
  entryRef.current = entrySubmission;
  return <RootNavigator entrySubmission={entrySubmission} />;
}

function renderAppShell(): { renderer: Renderer; entryRef: { current: UseEntrySubmissionResult | undefined } } {
  const entryRef: { current: UseEntrySubmissionResult | undefined } = { current: undefined };
  let renderer!: Renderer;
  act(() => {
    renderer = ReactTestRenderer.create(
      <ThemeProvider mode="dark">
        <SafeAreaProvider
          initialMetrics={{
            frame: { x: 0, y: 0, width: 390, height: 844 },
            insets: { top: 47, left: 0, right: 0, bottom: 34 },
          }}
        >
          <NavigationContainer ref={navigationRef}>
            <Harness entryRef={entryRef} />
          </NavigationContainer>
        </SafeAreaProvider>
      </ThemeProvider>,
    );
  });
  activeRenderer = renderer;
  return { renderer, entryRef };
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

function findButtonProps(renderer: Renderer, label: string): ButtonProps {
  const button = renderer.root
    .findAllByType(Button)
    .find((node) => (node.props as ButtonProps).label === label);
  if (!button) {
    throw new Error(`No Button found with label "${label}"`);
  }
  return button.props as ButtonProps;
}

function pressButton(renderer: Renderer, label: string): void {
  act(() => {
    findButtonProps(renderer, label).onPress();
  });
}

function screenTextShown(renderer: Renderer, text: string): boolean {
  return renderer.root.findAllByType(Text).some((node) => node.props.children === text);
}

/**
 * Flushes pending microtasks (the `checkConfigured()`/`submit()` await chains
 * triggered by a FAB tap) before assertions run. A macrotask boundary
 * (`setTimeout`) rather than a fixed number of `Promise.resolve()` hops,
 * since Node drains the entire microtask queue before any timer fires,
 * regardless of how many `await`s are chained inside the hook.
 */
async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

test('FAB tap while not configured shows an Alert whose action navigates to Settings', async () => {
  mockSettingsState.webhookUrl = '';
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

  const { renderer } = renderAppShell();
  pressByLabel(renderer, 'Acció ràpida');
  await flush();

  expect(alertSpy).toHaveBeenCalledTimes(1);
  const buttons = alertSpy.mock.calls[0]?.[2];
  const confirmButton = buttons?.[0];
  expect(confirmButton?.onPress).toBeDefined();

  act(() => {
    confirmButton?.onPress?.();
  });

  expect(screenTextShown(renderer, 'CONNEXIÓ')).toBe(true);
  alertSpy.mockRestore();
});

test('FAB tap while configured opens the overlay from Home or Analytics, and a successful Phase 1 POST closes it', async () => {
  mockSettingsState.webhookUrl = 'https://n8n.example.com/webhook';
  mockReadSecureItem.mockResolvedValue('secret-value');
  mockPostToN8n.mockResolvedValue({ ok: true } as Response);

  const { renderer } = renderAppShell();
  // Switch to the Analytics tab first, to prove the FAB is global rather than Home-scoped.
  pressByLabel(renderer, 'Estadístiques');

  pressByLabel(renderer, 'Acció ràpida');
  await flush();

  const [input] = renderer.root.findAllByType(TextInput);
  act(() => {
    (input.props.onChangeText as (text: string) => void)('hola conchi');
  });

  pressButton(renderer, 'Envia');
  await flush();

  expect(mockPostToN8n).toHaveBeenCalledWith(
    'https://n8n.example.com/webhook/send-expense',
    'secret-value',
    'hola conchi',
  );
  // Phase 1 succeeded -- the overlay closes (Phase 2 continues in the
  // background, tracked by the Bubble instead of this screen).
  expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
});

test("pressing Tanca on the open overlay runs MainTabs' real handleClose, closing it", async () => {
  mockSettingsState.webhookUrl = 'https://n8n.example.com/webhook';
  mockReadSecureItem.mockResolvedValue('secret-value');

  const { renderer } = renderAppShell();
  pressByLabel(renderer, 'Acció ràpida');
  await flush();

  // Sanity check: the overlay is actually open before closing it.
  expect(renderer.root.findAllByType(TextInput)).toHaveLength(1);

  pressByLabel(renderer, 'Tanca');

  expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
});

test('Phase 1 failure keeps the overlay open with an error and a working retry', async () => {
  mockSettingsState.webhookUrl = 'https://n8n.example.com/webhook';
  mockReadSecureItem.mockResolvedValue('secret-value');
  mockPostToN8n.mockResolvedValueOnce({ ok: false, status: 500 } as Response);

  const { renderer } = renderAppShell();
  pressByLabel(renderer, 'Acció ràpida');
  await flush();

  const [input] = renderer.root.findAllByType(TextInput);
  act(() => {
    (input.props.onChangeText as (text: string) => void)('hola conchi');
  });
  pressButton(renderer, 'Envia');
  await flush();

  expect(screenTextShown(renderer, 'El servidor ha retornat un error (500).')).toBe(true);
  expect(renderer.root.findAllByType(TextInput)).toHaveLength(1);

  mockPostToN8n.mockResolvedValueOnce({ ok: true } as Response);
  pressButton(renderer, 'Torna-ho a provar');
  await flush();

  expect(mockPostToN8n).toHaveBeenLastCalledWith(
    'https://n8n.example.com/webhook/send-expense',
    'secret-value',
    'hola conchi',
  );
  expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
});

test('a Phase 2 round-trip result mounts ConfirmationCard pre-filled, and Acceptar saves and dismisses it', async () => {
  mockSettingsState.webhookUrl = 'https://n8n.example.com/webhook';
  mockReadSecureItem.mockResolvedValue('secret-value');
  mockPostToN8n.mockResolvedValue({ ok: true } as Response);

  const { renderer, entryRef } = renderAppShell();
  pressByLabel(renderer, 'Acció ràpida');
  await flush();
  const [input] = renderer.root.findAllByType(TextInput);
  act(() => {
    (input.props.onChangeText as (text: string) => void)('cafè 2,50');
  });
  pressButton(renderer, 'Envia');
  await flush();

  // Stands in for `App.tsx`'s real FCM dispatch (out of this file's scope,
  // covered by `useEntrySubmission.test.ts`'s own `handleRoundTripResult`
  // coverage) — exercises `MainTabs`' wiring of the result into
  // `ConfirmationCard`.
  act(() => {
    entryRef.current?.handleRoundTripResult(MOCK_ENTRY);
  });

  expect(findButtonProps(renderer, 'Acceptar').disabled).toBe(false);
  const [amountInput] = renderer.root.findAllByType(TextInput).filter((n) => n.props.accessibilityLabel === 'Import');
  expect(amountInput.props.value).toBe('24.50');

  pressButton(renderer, 'Acceptar');
  await flush();

  expect(mockPostToN8n).toHaveBeenLastCalledWith(
    'https://n8n.example.com/webhook/save-entry',
    'secret-value',
    expect.objectContaining({ amount: 24.5, category: 'Alimentació' }),
  );
  expect(renderer.root.findAllByType(Button).some((n) => (n.props as ButtonProps).label === 'Acceptar')).toBe(false);
});

test('pressing the FAB again while ConfirmationCard is open is a no-op (the pending result is not discarded)', async () => {
  mockSettingsState.webhookUrl = 'https://n8n.example.com/webhook';
  mockReadSecureItem.mockResolvedValue('secret-value');
  mockPostToN8n.mockResolvedValue({ ok: true } as Response);

  const { renderer, entryRef } = renderAppShell();
  pressByLabel(renderer, 'Acció ràpida');
  await flush();
  const [input] = renderer.root.findAllByType(TextInput);
  act(() => {
    (input.props.onChangeText as (text: string) => void)('cafè 2,50');
  });
  pressButton(renderer, 'Envia');
  await flush();

  act(() => {
    entryRef.current?.handleRoundTripResult(MOCK_ENTRY);
  });
  expect(findButtonProps(renderer, 'Acceptar').disabled).toBe(false);

  pressByLabel(renderer, 'Acció ràpida');
  await flush();

  // The card is untouched: still mounted, pre-filled, Acceptar enabled —
  // the overlay did not reopen over it, and `entrySubmission.reset()` did
  // not discard the pending result.
  expect(findButtonProps(renderer, 'Acceptar').disabled).toBe(false);
  expect(renderer.root.findAllByType(TextInput).filter((n) => n.props.accessibilityLabel === 'Import')).toHaveLength(
    1,
  );
});

test('a failed save POST keeps ConfirmationCard open and shows an inline error banner', async () => {
  mockSettingsState.webhookUrl = 'https://n8n.example.com/webhook';
  mockReadSecureItem.mockResolvedValue('secret-value');
  mockPostToN8n.mockResolvedValueOnce({ ok: true } as Response);

  const { renderer, entryRef } = renderAppShell();
  pressByLabel(renderer, 'Acció ràpida');
  await flush();
  const [input] = renderer.root.findAllByType(TextInput);
  act(() => {
    (input.props.onChangeText as (text: string) => void)('cafè 2,50');
  });
  pressButton(renderer, 'Envia');
  await flush();

  act(() => {
    entryRef.current?.handleRoundTripResult(MOCK_ENTRY);
  });

  mockPostToN8n.mockResolvedValueOnce({ ok: false, status: 500 } as Response);
  pressButton(renderer, 'Acceptar');
  await flush();

  // The card stays open (not dismissed) and an inline error banner appears.
  expect(renderer.root.findAllByType(Button).some((n) => (n.props as ButtonProps).label === 'Acceptar')).toBe(true);
  expect(screenTextShown(renderer, entryRef.current?.saveErrorMessage as string)).toBe(true);
  expect(entryRef.current?.saveErrorMessage).toContain('500');
});
