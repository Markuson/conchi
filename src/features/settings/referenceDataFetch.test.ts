/**
 * Covers the I/O & Edge-Case Matrix rows owned by `fetchReferenceData`:
 * "First launch, fetch succeeds", "Not configured", "Fetch fails, no cache"
 * and "Fetch fails, cache exists" (the latter two collapse into the same
 * retry-scheduling behavior here, since the function itself doesn't care
 * whether a cache existed before the fetch — the store/cache-write side is
 * identical either way), plus reentrancy (overlapping calls must not double
 * a request or a retry timer) and the "contexts is optional" relaxation.
 * Also covers failure modes the matrix doesn't name individually: a secure-
 * store read that throws, a 200 response whose body doesn't parse as JSON,
 * and a 200 response whose `categories` don't match the expected shape.
 *
 * `postToN8n` and MMKV are mocked, mirroring the boundary
 * `useTracerBullet.test.ts` and `fcmClient.test.ts` draw around their own
 * `postToN8n` calls — but unlike the mocked-store approach those files use
 * for state they don't own, `store/referenceData` is left real here, so
 * `setReferenceData`'s actual merge logic runs and is asserted on directly
 * (this is the one file AD-16 allows to import it).
 */
import { postToN8n } from '../../lib/api/n8nClient';
import { getObject, setObject } from '../../lib/storage/mmkv';
import { readSecureItem } from '../../lib/storage/secureStore';
import { useSettingsStore } from '../../store';
import { REFERENCE_DATA_KEY, setReferenceData, useReferenceDataStore } from '../../store/referenceData';
import { fetchReferenceData } from './referenceDataFetch';

jest.mock('../../lib/api/n8nClient', () => ({
  ...jest.requireActual<typeof import('../../lib/api/n8nClient')>('../../lib/api/n8nClient'),
  postToN8n: jest.fn(),
}));

jest.mock('../../lib/storage/mmkv', () => ({
  getObject: jest.fn(),
  setObject: jest.fn(),
}));

jest.mock('../../lib/storage/secureStore', () => ({
  AUTH_SECRET_KEY: 'settings.authSecret',
  readSecureItem: jest.fn(),
}));

jest.mock('../../store', () => ({
  useSettingsStore: { getState: jest.fn() },
}));

const mockPostToN8n = postToN8n as jest.MockedFunction<typeof postToN8n>;
const mockGetObject = getObject as jest.MockedFunction<typeof getObject>;
const mockSetObject = setObject as jest.MockedFunction<typeof setObject>;
const mockReadSecureItem = readSecureItem as jest.MockedFunction<typeof readSecureItem>;
const mockGetState = useSettingsStore.getState as jest.MockedFunction<typeof useSettingsStore.getState>;

const jsonResponse = { categories: [{ name: 'Menjar', subcategories: ['Restaurant'] }], contexts: ['Personal'] };

function okResponse(body: unknown): Response {
  return { ok: true, json: () => Promise.resolve(body) } as unknown as Response;
}

beforeEach(() => {
  mockPostToN8n.mockReset();
  mockGetObject.mockReturnValue(undefined);
  mockSetObject.mockReset();
  mockReadSecureItem.mockReset();
  mockGetState.mockReset();
  // Real store, real setReferenceData — reset in-memory state between
  // tests since the module hydrates once and stays a singleton.
  setReferenceData({ categories: [], contexts: [] });
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

test('first launch, fetch succeeds: posts to CATEGORIES_PATH, writes the merged MMKV cache, and updates the real store', async () => {
  mockGetState.mockReturnValue({
    webhookUrl: 'https://n8n.example.com/webhook',
  } as ReturnType<typeof useSettingsStore.getState>);
  mockReadSecureItem.mockResolvedValue('secret-value');
  mockPostToN8n.mockResolvedValue(okResponse(jsonResponse));

  await fetchReferenceData();

  expect(mockPostToN8n).toHaveBeenCalledWith('https://n8n.example.com/webhook/get-categories', 'secret-value', {});
  expect(mockSetObject).toHaveBeenCalledWith(REFERENCE_DATA_KEY, jsonResponse);
  expect(useReferenceDataStore.getState()).toEqual(jsonResponse);
});

test('a response with valid categories but a missing contexts field still succeeds, defaulting contexts to []', async () => {
  mockGetState.mockReturnValue({
    webhookUrl: 'https://n8n.example.com/webhook',
  } as ReturnType<typeof useSettingsStore.getState>);
  mockReadSecureItem.mockResolvedValue('secret-value');
  mockPostToN8n.mockResolvedValue(okResponse({ categories: jsonResponse.categories }));

  await fetchReferenceData();

  const expected = { categories: jsonResponse.categories, contexts: [] };
  expect(mockSetObject).toHaveBeenCalledWith(REFERENCE_DATA_KEY, expected);
  expect(useReferenceDataStore.getState()).toEqual(expected);
});

test('a response with a malformed (non-array) contexts field still succeeds, defaulting contexts to []', async () => {
  mockGetState.mockReturnValue({
    webhookUrl: 'https://n8n.example.com/webhook',
  } as ReturnType<typeof useSettingsStore.getState>);
  mockReadSecureItem.mockResolvedValue('secret-value');
  mockPostToN8n.mockResolvedValue(okResponse({ categories: jsonResponse.categories, contexts: 'oops' }));

  await fetchReferenceData();

  expect(useReferenceDataStore.getState()).toEqual({ categories: jsonResponse.categories, contexts: [] });
});

test('setReferenceData merges a partial update onto existing state rather than replacing it', () => {
  setReferenceData({ categories: [{ name: 'A', subcategories: [] }], contexts: ['X'] });
  setReferenceData({ categories: [{ name: 'B', subcategories: [] }] });

  expect(useReferenceDataStore.getState()).toEqual({
    categories: [{ name: 'B', subcategories: [] }],
    contexts: ['X'],
  });
});

test('reentrant calls while a fetch is in flight reuse the same attempt instead of firing a second request', async () => {
  mockGetState.mockReturnValue({
    webhookUrl: 'https://n8n.example.com/webhook',
  } as ReturnType<typeof useSettingsStore.getState>);
  mockReadSecureItem.mockResolvedValue('secret-value');
  let resolvePost: (value: Response) => void = () => undefined;
  mockPostToN8n.mockReturnValue(new Promise<Response>((resolve) => (resolvePost = resolve)));

  const first = fetchReferenceData();
  const second = fetchReferenceData();

  resolvePost(okResponse(jsonResponse));
  await Promise.all([first, second]);

  expect(mockPostToN8n).toHaveBeenCalledTimes(1);
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
    expect(useReferenceDataStore.getState()).toEqual({ categories: [], contexts: [] });

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
    expect(useReferenceDataStore.getState()).toEqual({ categories: [], contexts: [] });
  });

  test('a 200 response whose body is unparseable is caught (never thrown) and retries once', async () => {
    mockPostToN8n.mockResolvedValue({
      ok: true,
      json: () => Promise.reject(new Error('Unexpected end of JSON input')),
    } as unknown as Response);

    await expect(fetchReferenceData()).resolves.toBeUndefined();
    expect(mockPostToN8n).toHaveBeenCalledTimes(1);
    expect(mockSetObject).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(5000);
    expect(mockPostToN8n).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(60000);
    expect(mockPostToN8n).toHaveBeenCalledTimes(2);
  });

  test('a 200 response whose categories do not match the expected shape is treated as a failure and retries once', async () => {
    mockPostToN8n.mockResolvedValue(okResponse({ categories: 'not-an-array', contexts: [] }));

    await fetchReferenceData();
    expect(mockPostToN8n).toHaveBeenCalledTimes(1);
    expect(mockSetObject).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(5000);
    expect(mockPostToN8n).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(60000);
    expect(mockPostToN8n).toHaveBeenCalledTimes(2);
  });

  test('a manual call while a retry is still pending cancels the stale timer instead of doubling it', async () => {
    mockPostToN8n.mockResolvedValueOnce({ ok: false, status: 500 } as Response);

    await fetchReferenceData();
    expect(mockPostToN8n).toHaveBeenCalledTimes(1);

    mockPostToN8n.mockResolvedValue(okResponse(jsonResponse));
    await fetchReferenceData();
    expect(mockPostToN8n).toHaveBeenCalledTimes(2);

    // The stale 5s retry from the first attempt must not have survived.
    await jest.advanceTimersByTimeAsync(60000);
    expect(mockPostToN8n).toHaveBeenCalledTimes(2);
  });
});
