/**
 * Covers the I/O & Edge-Case Matrix rows owned by `fetchReferenceData`:
 * "First launch, fetch succeeds", "Not configured", "Fetch fails, no cache"
 * and "Fetch fails, cache exists" (the latter two collapse into the same
 * retry-scheduling behavior here, since the function itself doesn't care
 * whether a cache existed before the fetch — the store/cache-write side is
 * identical either way). Also covers failure modes the matrix doesn't name
 * individually but `fetchReferenceData`'s own JSDoc guarantees are handled
 * the same way: a secure-store read that throws, a 200 response whose body
 * doesn't parse as JSON, and a 200 response whose body parses but doesn't
 * match the expected shape. `postToN8n`, the settings store, secure storage
 * and `store/referenceData` are all mocked, mirroring the boundary
 * `useTracerBullet.test.ts` and `fcmClient.test.ts` draw around their own
 * `postToN8n` calls.
 */
import { postToN8n } from '../../lib/api/n8nClient';
import { setObject } from '../../lib/storage/mmkv';
import { readSecureItem } from '../../lib/storage/secureStore';
import { useSettingsStore } from '../../store';
import { CATEGORIES_KEY, CONTEXTS_KEY, setReferenceData } from '../../store/referenceData';
import { fetchReferenceData } from './referenceDataFetch';

jest.mock('../../lib/api/n8nClient', () => ({
  ...jest.requireActual<typeof import('../../lib/api/n8nClient')>('../../lib/api/n8nClient'),
  postToN8n: jest.fn(),
}));

jest.mock('../../lib/storage/mmkv', () => ({
  setObject: jest.fn(),
}));

jest.mock('../../lib/storage/secureStore', () => ({
  AUTH_SECRET_KEY: 'settings.authSecret',
  readSecureItem: jest.fn(),
}));

jest.mock('../../store', () => ({
  useSettingsStore: { getState: jest.fn() },
}));

jest.mock('../../store/referenceData', () => ({
  CATEGORIES_KEY: 'referenceData.categories',
  CONTEXTS_KEY: 'referenceData.contexts',
  setReferenceData: jest.fn(),
}));

const mockPostToN8n = postToN8n as jest.MockedFunction<typeof postToN8n>;
const mockSetObject = setObject as jest.MockedFunction<typeof setObject>;
const mockReadSecureItem = readSecureItem as jest.MockedFunction<typeof readSecureItem>;
const mockGetState = useSettingsStore.getState as jest.MockedFunction<typeof useSettingsStore.getState>;
const mockSetReferenceData = setReferenceData as jest.MockedFunction<typeof setReferenceData>;

const jsonResponse = { categories: [{ name: 'Menjar', subcategories: ['Restaurant'] }], contexts: ['Personal'] };

beforeEach(() => {
  mockPostToN8n.mockReset();
  mockSetObject.mockReset();
  mockReadSecureItem.mockReset();
  mockGetState.mockReset();
  mockSetReferenceData.mockReset();
});

test('not configured: no webhookUrl skips the fetch entirely', async () => {
  mockGetState.mockReturnValue({ webhookUrl: '' } as ReturnType<typeof useSettingsStore.getState>);

  await fetchReferenceData();

  expect(mockReadSecureItem).not.toHaveBeenCalled();
  expect(mockPostToN8n).not.toHaveBeenCalled();
});

test('not configured: no auth secret skips the fetch entirely', async () => {
  mockGetState.mockReturnValue({
    webhookUrl: 'https://n8n.example.com/webhook',
  } as ReturnType<typeof useSettingsStore.getState>);
  mockReadSecureItem.mockResolvedValue(null);

  await fetchReferenceData();

  expect(mockPostToN8n).not.toHaveBeenCalled();
});

test('secure store read failure: caught and the fetch is skipped, never thrown', async () => {
  mockGetState.mockReturnValue({
    webhookUrl: 'https://n8n.example.com/webhook',
  } as ReturnType<typeof useSettingsStore.getState>);
  mockReadSecureItem.mockRejectedValue(new Error('secure storage unavailable'));

  await expect(fetchReferenceData()).resolves.toBeUndefined();

  expect(mockPostToN8n).not.toHaveBeenCalled();
});

test('first launch, fetch succeeds: posts to CATEGORIES_PATH, writes the MMKV cache, and updates the store', async () => {
  mockGetState.mockReturnValue({
    webhookUrl: 'https://n8n.example.com/webhook',
  } as ReturnType<typeof useSettingsStore.getState>);
  mockReadSecureItem.mockResolvedValue('secret-value');
  mockPostToN8n.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(jsonResponse),
  } as unknown as Response);

  await fetchReferenceData();

  expect(mockPostToN8n).toHaveBeenCalledWith('https://n8n.example.com/webhook/get-categories', 'secret-value', {});
  expect(mockSetObject).toHaveBeenCalledWith(CATEGORIES_KEY, jsonResponse.categories);
  expect(mockSetObject).toHaveBeenCalledWith(CONTEXTS_KEY, jsonResponse.contexts);
  expect(mockSetReferenceData).toHaveBeenCalledWith(jsonResponse);
});

describe('fetch failure retry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockGetState.mockReturnValue({
      webhookUrl: 'https://n8n.example.com/webhook',
    } as ReturnType<typeof useSettingsStore.getState>);
    mockReadSecureItem.mockResolvedValue('secret-value');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('HTTP failure schedules exactly one retry, which is not itself retried', async () => {
    mockPostToN8n.mockResolvedValue({ ok: false, status: 500 } as Response);

    await fetchReferenceData();
    expect(mockPostToN8n).toHaveBeenCalledTimes(1);
    expect(mockSetReferenceData).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(5000);
    expect(mockPostToN8n).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(60000);
    expect(mockPostToN8n).toHaveBeenCalledTimes(2);
  });

  test('a rejected postToN8n call is caught (never thrown) and also retries once', async () => {
    mockPostToN8n.mockRejectedValue(new Error('Network request failed'));

    await expect(fetchReferenceData()).resolves.toBeUndefined();
    expect(mockPostToN8n).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(5000);
    expect(mockPostToN8n).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(60000);
    expect(mockPostToN8n).toHaveBeenCalledTimes(2);
  });

  test('the store/cache stay untouched when every attempt fails', async () => {
    mockPostToN8n.mockResolvedValue({ ok: false, status: 500 } as Response);

    await fetchReferenceData();
    await jest.advanceTimersByTimeAsync(5000);

    expect(mockSetObject).not.toHaveBeenCalled();
    expect(mockSetReferenceData).not.toHaveBeenCalled();
  });

  test('a 200 response whose body is unparseable is caught (never thrown) and retries once', async () => {
    mockPostToN8n.mockResolvedValue({
      ok: true,
      json: () => Promise.reject(new Error('Unexpected end of JSON input')),
    } as unknown as Response);

    await expect(fetchReferenceData()).resolves.toBeUndefined();
    expect(mockPostToN8n).toHaveBeenCalledTimes(1);
    expect(mockSetObject).not.toHaveBeenCalled();
    expect(mockSetReferenceData).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(5000);
    expect(mockPostToN8n).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(60000);
    expect(mockPostToN8n).toHaveBeenCalledTimes(2);
  });

  test('a 200 response whose body does not match the expected shape is treated as a failure and retries once', async () => {
    mockPostToN8n.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ categories: 'not-an-array', contexts: [] }),
    } as unknown as Response);

    await fetchReferenceData();
    expect(mockPostToN8n).toHaveBeenCalledTimes(1);
    expect(mockSetObject).not.toHaveBeenCalled();
    expect(mockSetReferenceData).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(5000);
    expect(mockPostToN8n).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(60000);
    expect(mockPostToN8n).toHaveBeenCalledTimes(2);
  });
});
