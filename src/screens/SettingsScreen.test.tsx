/**
 * Screen-level coverage for `SettingsScreen`'s CONNEXIÓ wiring — the I/O &
 * Edge-Case Matrix rows that are pure *orchestration* between
 * `validateConnection`, `writeSecureItem`, and `settingsStore`, and so aren't
 * exercised by any of those modules' own isolated unit tests: "Happy path
 * validate", "Secure-store write failure", the format-invalid → inline "URL
 * no vàlida" path, plus the `network`/`http` error-message branches, the
 * mid-flight field-disable behavior, the secret-hydration race guard, and
 * Descartar's revert-to-persisted behavior.
 *
 * `validateConnection` and `secureStore` are mocked so each row's exact
 * response/rejection shape can be forced. `../lib/storage/mmkv` is mocked
 * the same way `settingsStore.test.ts` mocks it, so the *real* `settingsStore`
 * (via the real `../store` aggregator `SettingsScreen` actually imports) runs
 * against a controllable backing store instead of real MMKV — this exercises
 * the real store wiring (not a stand-in) while keeping tests isolated from
 * each other via `useSettingsStore.setState(...)` in `beforeEach`.
 */
jest.mock('../lib/storage/mmkv', () => ({
  getString: jest.fn(() => undefined),
  setString: jest.fn(),
}));

jest.mock('../features/settings/validateConnection', () => ({
  validateConnection: jest.fn(),
}));

jest.mock('../lib/storage/secureStore', () => ({
  readSecureItem: jest.fn(),
  writeSecureItem: jest.fn(),
}));

import React from 'react';
import ReactTestRenderer, { act, type ReactTestRenderer as Renderer } from 'react-test-renderer';
import { Text, TextInput } from 'react-native';

import { SettingsScreen } from './SettingsScreen';
import { validateConnection } from '../features/settings/validateConnection';
import { readSecureItem, writeSecureItem } from '../lib/storage/secureStore';
import { setString } from '../lib/storage/mmkv';
import { useSettingsStore } from '../store';
import { ThemeProvider } from '../theme/ThemeProvider';

/** Matches `SettingsScreen`'s own private `AUTH_SECRET_KEY` constant. */
const AUTH_SECRET_KEY = 'settings.authSecret';

const mockValidateConnection = validateConnection as jest.MockedFunction<typeof validateConnection>;
const mockReadSecureItem = readSecureItem as jest.MockedFunction<typeof readSecureItem>;
const mockWriteSecureItem = writeSecureItem as jest.MockedFunction<typeof writeSecureItem>;
const mockSetString = setString as jest.MockedFunction<typeof setString>;

let activeRenderer: Renderer | undefined;

beforeEach(() => {
  mockValidateConnection.mockReset();
  mockReadSecureItem.mockReset().mockResolvedValue(null);
  mockWriteSecureItem.mockReset();
  mockSetString.mockReset();
  useSettingsStore.setState({ webhookUrl: '', theme: 'system' });
});

afterEach(() => {
  if (activeRenderer) {
    act(() => {
      activeRenderer?.unmount();
    });
    activeRenderer = undefined;
  }
});

function renderScreen(): Renderer {
  let renderer!: Renderer;
  act(() => {
    renderer = ReactTestRenderer.create(
      <ThemeProvider mode="dark">
        <SettingsScreen />
      </ThemeProvider>,
    );
  });
  activeRenderer = renderer;
  return renderer;
}

/** Lets the promise chains inside `handleAccept` (mocked `await`s) fully settle. */
async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setImmediate(resolve));
  });
}

function findInput(renderer: Renderer, accessibilityLabel: string): ReactTestRenderer.ReactTestInstance {
  const input = renderer.root.findAllByType(TextInput).find((node) => node.props.accessibilityLabel === accessibilityLabel);
  if (!input) {
    throw new Error(`No TextInput found with accessibilityLabel "${accessibilityLabel}"`);
  }
  return input;
}

function typeInto(renderer: Renderer, accessibilityLabel: string, text: string): void {
  const onChangeText = findInput(renderer, accessibilityLabel).props.onChangeText as (value: string) => void;
  act(() => {
    onChangeText(text);
  });
}

/** Walks up from a `Text` with the given content to its nearest ancestor `Pressable` and presses it. */
function pressButton(renderer: Renderer, label: string): void {
  const textNode = renderer.root.findAllByType(Text).find((node) => node.props.children === label);
  if (!textNode) {
    throw new Error(`No Text found with children "${label}"`);
  }
  let node = textNode.parent;
  while (node && typeof node.props.onPress !== 'function') {
    node = node.parent;
  }
  if (!node) {
    throw new Error(`No Pressable ancestor found for label "${label}"`);
  }
  const onPress = node.props.onPress as () => void;
  act(() => {
    onPress();
  });
}

function findText(renderer: Renderer, text: string): boolean {
  return renderer.root.findAllByType(Text).some((node) => node.props.children === text);
}

test('happy path: validate ok saves the URL to settingsStore and the secret to secure-store, then shows success', async () => {
  mockValidateConnection.mockResolvedValue({ ok: true });
  mockWriteSecureItem.mockResolvedValue(undefined);

  const renderer = renderScreen();
  typeInto(renderer, 'URL del webhook', 'https://n8n.example.com/webhook');
  typeInto(renderer, "Secret d'autenticació", 'top-secret');

  pressButton(renderer, 'Acceptar');
  await flush();

  expect(mockValidateConnection).toHaveBeenCalledWith('https://n8n.example.com/webhook', 'top-secret');
  expect(mockWriteSecureItem).toHaveBeenCalledWith(AUTH_SECRET_KEY, 'top-secret');
  expect(useSettingsStore.getState().webhookUrl).toBe('https://n8n.example.com/webhook');
  expect(mockSetString).toHaveBeenCalledWith('settings.webhookUrl', 'https://n8n.example.com/webhook');
  expect(findText(renderer, 'Connexió desada correctament.')).toBe(true);
});

test('secure-store write failure: shows an error, reports nothing as saved, keeps fields editable', async () => {
  mockValidateConnection.mockResolvedValue({ ok: true });
  mockWriteSecureItem.mockRejectedValue(new Error('Keystore unavailable'));

  const renderer = renderScreen();
  typeInto(renderer, 'URL del webhook', 'https://n8n.example.com/webhook');
  typeInto(renderer, "Secret d'autenticació", 'top-secret');

  pressButton(renderer, 'Acceptar');
  await flush();

  expect(mockWriteSecureItem).toHaveBeenCalledWith(AUTH_SECRET_KEY, 'top-secret');
  expect(findText(renderer, "No s'ha pogut desar el secret de forma segura.")).toBe(true);
  expect(findText(renderer, 'Connexió desada correctament.')).toBe(false);

  // Nothing reported as saved.
  expect(useSettingsStore.getState().webhookUrl).toBe('');
  expect(mockSetString).not.toHaveBeenCalled();

  // Fields stay editable: the typed (unsaved) values are still there, not cleared/disabled.
  const urlInput = findInput(renderer, 'URL del webhook');
  const secretInput = findInput(renderer, "Secret d'autenticació");
  expect(urlInput.props.value).toBe('https://n8n.example.com/webhook');
  expect(urlInput.props.editable).not.toBe(false);
  expect(secretInput.props.value).toBe('top-secret');
  expect(secretInput.props.editable).not.toBe(false);
});

test('invalid URL format shows "URL no vàlida" inline without saving anything', async () => {
  mockValidateConnection.mockResolvedValue({ ok: false, reason: 'format' });

  const renderer = renderScreen();
  typeInto(renderer, 'URL del webhook', 'not-a-url');
  typeInto(renderer, "Secret d'autenticació", 'top-secret');

  pressButton(renderer, 'Acceptar');
  await flush();

  expect(findText(renderer, 'URL no vàlida')).toBe(true);
  expect(mockWriteSecureItem).not.toHaveBeenCalled();
  expect(useSettingsStore.getState().webhookUrl).toBe('');
  expect(mockSetString).not.toHaveBeenCalled();
});

test('a network failure shows the network-specific error message', async () => {
  mockValidateConnection.mockResolvedValue({ ok: false, reason: 'network' });

  const renderer = renderScreen();
  typeInto(renderer, 'URL del webhook', 'https://n8n.example.com/webhook');
  typeInto(renderer, "Secret d'autenticació", 'top-secret');

  pressButton(renderer, 'Acceptar');
  await flush();

  expect(findText(renderer, "No s'ha pogut connectar. Comprova la connexió i torna-ho a provar.")).toBe(true);
  expect(findText(renderer, 'El servidor ha retornat un error. Comprova la URL i el secret.')).toBe(false);
  expect(mockWriteSecureItem).not.toHaveBeenCalled();
  expect(useSettingsStore.getState().webhookUrl).toBe('');
});

test('an HTTP error response shows the http-specific error message', async () => {
  mockValidateConnection.mockResolvedValue({ ok: false, reason: 'http' });

  const renderer = renderScreen();
  typeInto(renderer, 'URL del webhook', 'https://n8n.example.com/webhook');
  typeInto(renderer, "Secret d'autenticació", 'top-secret');

  pressButton(renderer, 'Acceptar');
  await flush();

  expect(findText(renderer, 'El servidor ha retornat un error. Comprova la URL i el secret.')).toBe(true);
  expect(findText(renderer, "No s'ha pogut connectar. Comprova la connexió i torna-ho a provar.")).toBe(false);
  expect(mockWriteSecureItem).not.toHaveBeenCalled();
  expect(useSettingsStore.getState().webhookUrl).toBe('');
});

test('Descartar reverts both fields to the last-persisted values and makes no persistence call', async () => {
  useSettingsStore.setState({ webhookUrl: 'https://persisted.example.com' });
  mockReadSecureItem.mockResolvedValue('persisted-secret');

  const renderer = renderScreen();
  await flush(); // let the mount-time secret hydration effect resolve first

  typeInto(renderer, 'URL del webhook', 'https://scratch.example.com/typo');
  typeInto(renderer, "Secret d'autenticació", 'scratch-secret');

  pressButton(renderer, 'Descartar');

  expect(findInput(renderer, 'URL del webhook').props.value).toBe('https://persisted.example.com');
  expect(findInput(renderer, "Secret d'autenticació").props.value).toBe('persisted-secret');
  expect(mockValidateConnection).not.toHaveBeenCalled();
  expect(mockWriteSecureItem).not.toHaveBeenCalled();
  expect(mockSetString).not.toHaveBeenCalled();
});

test('disables both fields while a request is in flight, and re-enables them once it settles', async () => {
  let resolveValidate!: (result: { ok: true }) => void;
  mockValidateConnection.mockReturnValue(
    new Promise((resolve) => {
      resolveValidate = resolve;
    }),
  );
  mockWriteSecureItem.mockResolvedValue(undefined);

  const renderer = renderScreen();
  typeInto(renderer, 'URL del webhook', 'https://n8n.example.com/webhook');
  typeInto(renderer, "Secret d'autenticació", 'top-secret');

  pressButton(renderer, 'Acceptar');

  // The validate request is still pending — fields should be disabled now.
  expect(findInput(renderer, 'URL del webhook').props.editable).toBe(false);
  expect(findInput(renderer, "Secret d'autenticació").props.editable).toBe(false);

  await act(async () => {
    resolveValidate({ ok: true });
    await new Promise((resolve) => setImmediate(resolve));
  });

  expect(findInput(renderer, 'URL del webhook').props.editable).not.toBe(false);
  expect(findInput(renderer, "Secret d'autenticació").props.editable).not.toBe(false);
});

test('typing into the secret field before the secure-store hydration resolves is not clobbered', async () => {
  let resolveRead!: (value: string | null) => void;
  mockReadSecureItem.mockReturnValue(
    new Promise((resolve) => {
      resolveRead = resolve;
    }),
  );

  const renderer = renderScreen();
  typeInto(renderer, "Secret d'autenticació", 'user-typed-before-hydration');

  await act(async () => {
    resolveRead('late-persisted-secret');
    await new Promise((resolve) => setImmediate(resolve));
  });

  expect(findInput(renderer, "Secret d'autenticació").props.value).toBe('user-typed-before-hydration');
});
