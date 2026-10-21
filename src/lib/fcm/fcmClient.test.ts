/**
 * Covers the I/O & Edge-Case Matrix rows owned by `fcmClient`: "Happy path"
 * and "Permission denied" (`getFcmToken`), "Registration HTTP failure"
 * (`registerFcmToken`, via its `postToN8n` delegation — see
 * `n8nClient.test.ts` for the header-building logic itself), and "Foreground
 * message received" (`onForegroundMessage`). `postToN8n` is mocked so this
 * exercises only `registerFcmToken`'s own URL-building, not real networking —
 * the same boundary `useTracerBullet.test.ts` draws. `expo-notifications` is
 * mocked via `__mocks__/expo-notifications.js` (Jest auto-applies it).
 */
import * as Notifications from 'expo-notifications';

import { postToN8n } from '../api/n8nClient';
import { getFcmToken, onForegroundMessage, registerFcmToken } from './fcmClient';
import type { FcmDataPayload } from './types';

jest.mock('../api/n8nClient', () => ({
  ...jest.requireActual<typeof import('../api/n8nClient')>('../api/n8nClient'),
  postToN8n: jest.fn(),
}));

const mockPostToN8n = postToN8n as jest.MockedFunction<typeof postToN8n>;
const mockGetPermissionsAsync = Notifications.getPermissionsAsync as jest.MockedFunction<
  typeof Notifications.getPermissionsAsync
>;
const mockRequestPermissionsAsync = Notifications.requestPermissionsAsync as jest.MockedFunction<
  typeof Notifications.requestPermissionsAsync
>;
const mockGetDevicePushTokenAsync = Notifications.getDevicePushTokenAsync as jest.MockedFunction<
  typeof Notifications.getDevicePushTokenAsync
>;
const mockAddNotificationReceivedListener = Notifications.addNotificationReceivedListener as jest.MockedFunction<
  typeof Notifications.addNotificationReceivedListener
>;

beforeEach(() => {
  mockPostToN8n.mockReset();
  mockGetPermissionsAsync.mockReset();
  mockRequestPermissionsAsync.mockReset();
  mockGetDevicePushTokenAsync.mockReset();
  mockAddNotificationReceivedListener.mockReset();
});

describe('getFcmToken', () => {
  test('happy path: permission already granted, returns the device token without re-requesting', async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' } as Awaited<
      ReturnType<typeof Notifications.getPermissionsAsync>
    >);
    mockGetDevicePushTokenAsync.mockResolvedValue({ type: 'android', data: 'device-token-123' });

    const token = await getFcmToken();

    expect(token).toBe('device-token-123');
    expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
  });

  test('permission undetermined then granted on request: requests permission and returns the token', async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: 'undetermined' } as Awaited<
      ReturnType<typeof Notifications.getPermissionsAsync>
    >);
    mockRequestPermissionsAsync.mockResolvedValue({ status: 'granted' } as Awaited<
      ReturnType<typeof Notifications.requestPermissionsAsync>
    >);
    mockGetDevicePushTokenAsync.mockResolvedValue({ type: 'android', data: 'device-token-456' });

    const token = await getFcmToken();

    expect(token).toBe('device-token-456');
    expect(mockRequestPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  test('permission denied: resolves null without reading a device token', async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: 'undetermined' } as Awaited<
      ReturnType<typeof Notifications.getPermissionsAsync>
    >);
    mockRequestPermissionsAsync.mockResolvedValue({ status: 'denied' } as Awaited<
      ReturnType<typeof Notifications.requestPermissionsAsync>
    >);

    const token = await getFcmToken();

    expect(token).toBeNull();
    expect(mockGetDevicePushTokenAsync).not.toHaveBeenCalled();
  });
});

describe('registerFcmToken', () => {
  test('happy path: POSTs to {webhookUrl}/register-token with the token as the body', async () => {
    mockPostToN8n.mockResolvedValue({ ok: true } as Response);

    await registerFcmToken('device-token-123', 'https://n8n.example.com', 'my-secret');

    expect(mockPostToN8n).toHaveBeenCalledWith('https://n8n.example.com/register-token', 'my-secret', {
      token: 'device-token-123',
    });
  });

  test('registration HTTP failure: a rejected postToN8n call propagates to the caller', async () => {
    mockPostToN8n.mockRejectedValue(new Error('Network request failed'));

    await expect(registerFcmToken('device-token-123', 'https://n8n.example.com', 'my-secret')).rejects.toThrow(
      'Network request failed',
    );
  });
});

describe('onForegroundMessage', () => {
  /** Registers `onForegroundMessage(callback)` and returns the native listener the mock captured, so the test can fire it directly with a raw event. */
  function registerAndCaptureListener(callback: (payload: FcmDataPayload) => void): (event: unknown) => void {
    let capturedListener: ((event: unknown) => void) | undefined;
    mockAddNotificationReceivedListener.mockImplementation(((listener: (event: unknown) => void) => {
      capturedListener = listener;
      return { remove: jest.fn() };
    }) as typeof Notifications.addNotificationReceivedListener);

    onForegroundMessage(callback);

    expect(capturedListener).toBeDefined();
    return capturedListener!;
  }

  test('narrows the native event to FcmDataPayload and forwards it to the callback', () => {
    const callback = jest.fn<void, [FcmDataPayload]>();
    const listener = registerAndCaptureListener(callback);

    listener({ request: { content: { data: { type: 'invoice_known', entryId: 'entry-1' } } } });

    expect(callback).toHaveBeenCalledWith({ type: 'invoice_known', entryId: 'entry-1' });
  });

  const SAMPLE_ENTRY = {
    id: 'e1',
    userId: 'u1',
    amount: 12.5,
    currency: 'EUR',
    category: 'Menjar',
    subcategory: 'Restaurant',
    description: 'Sopar',
    date: '2026-10-21',
    origin: 'app',
  };

  test('round_trip_result: parses a JSON-stringified entry field (FCM data payloads are string-only on the wire)', () => {
    const callback = jest.fn<void, [FcmDataPayload]>();
    const listener = registerAndCaptureListener(callback);

    listener({
      request: {
        content: { data: { type: 'round_trip_result', entryId: 'entry-1', entry: JSON.stringify(SAMPLE_ENTRY) } },
      },
    });

    expect(callback).toHaveBeenCalledWith({ type: 'round_trip_result', entryId: 'entry-1', entry: SAMPLE_ENTRY });
  });

  test('round_trip_result: an already-parsed object entry passes through unchanged', () => {
    const callback = jest.fn<void, [FcmDataPayload]>();
    const listener = registerAndCaptureListener(callback);

    listener({
      request: { content: { data: { type: 'round_trip_result', entryId: 'entry-1', entry: SAMPLE_ENTRY } } },
    });

    expect(callback).toHaveBeenCalledWith({ type: 'round_trip_result', entryId: 'entry-1', entry: SAMPLE_ENTRY });
  });

  test('round_trip_result: malformed JSON entry is dropped rather than forwarded or crashing', () => {
    const callback = jest.fn<void, [FcmDataPayload]>();
    const listener = registerAndCaptureListener(callback);

    listener({
      request: { content: { data: { type: 'round_trip_result', entryId: 'entry-1', entry: '{not json' } } },
    });

    expect(callback).not.toHaveBeenCalled();
  });

  test('round_trip_result: entry missing entirely is dropped rather than forwarded as undefined', () => {
    const callback = jest.fn<void, [FcmDataPayload]>();
    const listener = registerAndCaptureListener(callback);

    listener({ request: { content: { data: { type: 'round_trip_result', entryId: 'entry-1' } } } });

    expect(callback).not.toHaveBeenCalled();
  });

  test('round_trip_result: entry that parses to valid JSON but not an object (e.g. "null") is dropped', () => {
    const callback = jest.fn<void, [FcmDataPayload]>();
    const listener = registerAndCaptureListener(callback);

    listener({
      request: { content: { data: { type: 'round_trip_result', entryId: 'entry-1', entry: 'null' } } },
    });

    expect(callback).not.toHaveBeenCalled();
  });
});
