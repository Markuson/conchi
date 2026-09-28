/**
 * Covers `resolveConfiguredCredentials`'s "webhookUrl + secret" guard,
 * extracted from three call sites (`App.tsx`'s FCM effect,
 * `referenceDataFetch.ts`, `useTracerBullet.ts`'s `checkConfigured`) that
 * previously hand-rolled the same logic. Mirrors the mocking boundary those
 * call sites' own tests already draw around `secureStore`/the settings store.
 */
import { readSecureItem } from '../storage/secureStore';
import { useSettingsStore } from '../../store';
import { resolveConfiguredCredentials } from './connection';

jest.mock('../storage/secureStore', () => ({
  AUTH_SECRET_KEY: 'settings.authSecret',
  readSecureItem: jest.fn(),
}));

jest.mock('../../store', () => ({
  useSettingsStore: { getState: jest.fn() },
}));

const mockReadSecureItem = readSecureItem as jest.MockedFunction<typeof readSecureItem>;
const mockGetState = useSettingsStore.getState as jest.MockedFunction<typeof useSettingsStore.getState>;

let logSpy: jest.SpyInstance;

beforeEach(() => {
  mockReadSecureItem.mockReset();
  mockGetState.mockReset();
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  logSpy.mockRestore();
});

test('returns null without reading the secret when webhookUrl is empty', async () => {
  mockGetState.mockReturnValue({ webhookUrl: '' } as ReturnType<typeof useSettingsStore.getState>);

  const result = await resolveConfiguredCredentials();

  expect(result).toBeNull();
  expect(mockReadSecureItem).not.toHaveBeenCalled();
});

test('returns null when the auth secret is missing', async () => {
  mockGetState.mockReturnValue({
    webhookUrl: 'https://n8n.example.com/webhook',
  } as ReturnType<typeof useSettingsStore.getState>);
  mockReadSecureItem.mockResolvedValue(null);

  const result = await resolveConfiguredCredentials();

  expect(result).toBeNull();
});

test('returns null (never throws) when reading the secret throws', async () => {
  mockGetState.mockReturnValue({
    webhookUrl: 'https://n8n.example.com/webhook',
  } as ReturnType<typeof useSettingsStore.getState>);
  mockReadSecureItem.mockRejectedValue(new Error('secure storage unavailable'));

  await expect(resolveConfiguredCredentials()).resolves.toBeNull();
});

test('returns the webhookUrl + secret pair when both are present', async () => {
  mockGetState.mockReturnValue({
    webhookUrl: 'https://n8n.example.com/webhook',
  } as ReturnType<typeof useSettingsStore.getState>);
  mockReadSecureItem.mockResolvedValue('secret-value');

  const result = await resolveConfiguredCredentials();

  expect(result).toEqual({ webhookUrl: 'https://n8n.example.com/webhook', secret: 'secret-value' });
});

test('logs nothing when logPrefix is omitted, even on every skip path', async () => {
  mockGetState.mockReturnValue({ webhookUrl: '' } as ReturnType<typeof useSettingsStore.getState>);
  await resolveConfiguredCredentials();

  mockGetState.mockReturnValue({
    webhookUrl: 'https://n8n.example.com/webhook',
  } as ReturnType<typeof useSettingsStore.getState>);
  mockReadSecureItem.mockResolvedValue(null);
  await resolveConfiguredCredentials();

  expect(logSpy).not.toHaveBeenCalled();
});

test('tags each skip reason with the given logPrefix', async () => {
  mockGetState.mockReturnValue({ webhookUrl: '' } as ReturnType<typeof useSettingsStore.getState>);

  await resolveConfiguredCredentials('referenceData');

  expect(logSpy).toHaveBeenCalledWith('[referenceData] skipped: no webhookUrl configured');
});
