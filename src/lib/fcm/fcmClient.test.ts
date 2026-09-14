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
  test('narrows the native event to FcmDataPayload and forwards it to the callback', () => {
    let capturedListener: ((event: unknown) => void) | undefined;
    mockAddNotificationReceivedListener.mockImplementation(((listener: (event: unknown) => void) => {
      capturedListener = listener;
      return { remove: jest.fn() };
    }) as typeof Notifications.addNotificationReceivedListener);

    const callback = jest.fn<void, [FcmDataPayload]>();
    onForegroundMessage(callback);

    expect(capturedListener).toBeDefined();
    const payload: FcmDataPayload = { type: 'invoice_known', entryId: 'entry-1' };
    capturedListener!({ request: { content: { data: payload } } });

    expect(callback).toHaveBeenCalledWith(payload);
  });
});
