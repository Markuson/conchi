/**
 * App-shell test proving Story 1.6's end-to-end causal chain: FAB tap while
 * unconfigured shows an `Alert` whose only action navigates to Settings; FAB
 * tap while configured (from either Home or Analytics — the FAB is global,
 * not Home-scoped) opens the tracer-bullet modal, and a successful submit
 * shows n8n's raw response. Only `postToN8n` (the actual network boundary)
 * is mocked; the settings store and secure-storage read/write go through
 * mocked replacements for `../store` and `../lib/storage/secureStore` (kept
 * out of a static `import` here since `src/navigation/index.test.tsx` is not
 * on the `no-restricted-imports` override list — only `src/navigation/index.tsx`
 * itself is, per this story's Code Map).
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

jest.mock('../store', () => ({ useSettingsStore: mockUseSettingsStore }));

jest.mock('../lib/api/n8nClient', () => ({
  postToN8n: jest.fn(),
}));

jest.mock('../lib/storage/secureStore', () => ({
  AUTH_SECRET_KEY: 'settings.authSecret',
  readSecureItem: jest.fn(),
}));

import { postToN8n } from '../lib/api/n8nClient';
import { readSecureItem } from '../lib/storage/secureStore';
import { RootNavigator } from './index';
import { ThemeProvider } from '../theme/ThemeProvider';

const mockPostToN8n = postToN8n as jest.MockedFunction<typeof postToN8n>;
const mockReadSecureItem = readSecureItem as jest.MockedFunction<typeof readSecureItem>;

const navigationRef = createNavigationContainerRef();

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

function renderAppShell(): Renderer {
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
            <RootNavigator />
          </NavigationContainer>
        </SafeAreaProvider>
      </ThemeProvider>,
    );
  });
  activeRenderer = renderer;
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

  const renderer = renderAppShell();
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

test('FAB tap while configured opens the same modal from Home or Analytics, and submit shows the raw response', async () => {
  mockSettingsState.webhookUrl = 'https://n8n.example.com/webhook';
  mockReadSecureItem.mockResolvedValue('secret-value');
  mockPostToN8n.mockResolvedValue({ ok: true, text: () => Promise.resolve('pong') } as unknown as Response);

  const renderer = renderAppShell();
  // Switch to the Analytics tab first, to prove the FAB is global rather than Home-scoped.
  pressByLabel(renderer, 'Estadístiques');

  pressByLabel(renderer, 'Acció ràpida');
  await flush();

  const [input] = renderer.root.findAllByType(TextInput);
  act(() => {
    (input.props.onChangeText as (text: string) => void)('hola conchi');
  });

  pressByLabel(renderer, 'Envia');
  await flush();

  expect(mockPostToN8n).toHaveBeenCalledWith('https://n8n.example.com/webhook', 'secret-value', 'hola conchi');
  expect(screenTextShown(renderer, 'pong')).toBe(true);
});

test("pressing Tanca on the open modal runs MainTabs' real handleClose, closing it", async () => {
  mockSettingsState.webhookUrl = 'https://n8n.example.com/webhook';
  mockReadSecureItem.mockResolvedValue('secret-value');

  const renderer = renderAppShell();
  pressByLabel(renderer, 'Acció ràpida');
  await flush();

  // Sanity check: the modal is actually open before closing it.
  expect(renderer.root.findAllByType(TextInput)).toHaveLength(1);

  pressByLabel(renderer, 'Tanca');

  expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
});
