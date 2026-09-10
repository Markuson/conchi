/**
 * Covers the I/O & Edge-Case Matrix's hydration/persistence expectations:
 * `webhookUrl`/`theme` hydrate from MMKV at store creation, and each setter
 * persists back to MMKV as a side effect. The store module reads MMKV at
 * top-level `create(...)` evaluation time, so each test re-imports it fresh
 * (via `jest.resetModules()` + `require`) after configuring the mock return
 * values it should hydrate from. Dynamic `import()` isn't an option here —
 * this repo's Babel config doesn't lower it to a CommonJS `require`, so Jest
 * throws ("dynamic import callback was invoked without
 * --experimental-vm-modules") rather than resolving a fresh module instance.
 *
 * `mockGetString`/`mockSetString` are declared before `jest.mock(...)` and
 * referenced (not recreated) inside its factory — `babel-plugin-jest-hoist`
 * specifically allows referencing outer variables named with a `mock` prefix
 * from a hoisted factory. This matters because `jest.resetModules()` re-runs
 * the mock factory on the next `require('../../lib/storage/mmkv')`; if the
 * factory created new `jest.fn()`s itself, each reset would silently produce
 * a *different* mock than the one this file configured and asserts against.
 */
const mockGetString = jest.fn<string | undefined, [string]>();
const mockSetString = jest.fn<void, [string, string]>();

jest.mock('../../lib/storage/mmkv', () => ({
  getString: mockGetString,
  setString: mockSetString,
}));

import type * as SettingsStoreModule from './settingsStore';

function freshStore(): typeof SettingsStoreModule.useSettingsStore {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports -- see module doc comment above
  const mod = require('./settingsStore') as typeof SettingsStoreModule;
  return mod.useSettingsStore;
}

beforeEach(() => {
  mockGetString.mockReset();
  mockSetString.mockReset();
});

test('hydrates webhookUrl and theme from MMKV at store creation', () => {
  mockGetString.mockImplementation((key: string) => {
    if (key === 'settings.webhookUrl') return 'https://persisted.example.com';
    if (key === 'settings.theme') return 'dark';
    return undefined;
  });

  const useSettingsStore = freshStore();

  expect(useSettingsStore.getState().webhookUrl).toBe('https://persisted.example.com');
  expect(useSettingsStore.getState().theme).toBe('dark');
});

test('defaults webhookUrl to empty string and theme to "system" when nothing is persisted', () => {
  mockGetString.mockReturnValue(undefined);

  const useSettingsStore = freshStore();

  expect(useSettingsStore.getState().webhookUrl).toBe('');
  expect(useSettingsStore.getState().theme).toBe('system');
});

test('falls back to "system" for a persisted theme value outside the known union', () => {
  mockGetString.mockImplementation((key: string) => (key === 'settings.theme' ? 'sepia' : undefined));

  const useSettingsStore = freshStore();

  expect(useSettingsStore.getState().theme).toBe('system');
});

test('setWebhookUrl updates state and persists to MMKV as a side effect', () => {
  mockGetString.mockReturnValue(undefined);
  const useSettingsStore = freshStore();

  useSettingsStore.getState().setWebhookUrl('https://new.example.com');

  expect(useSettingsStore.getState().webhookUrl).toBe('https://new.example.com');
  expect(mockSetString).toHaveBeenCalledWith('settings.webhookUrl', 'https://new.example.com');
});

test('setTheme updates state and persists to MMKV as a side effect', () => {
  mockGetString.mockReturnValue(undefined);
  const useSettingsStore = freshStore();

  useSettingsStore.getState().setTheme('light');

  expect(useSettingsStore.getState().theme).toBe('light');
  expect(mockSetString).toHaveBeenCalledWith('settings.theme', 'light');
});
