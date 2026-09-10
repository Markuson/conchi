/**
 * Covers the I/O & Edge-Case Matrix rows owned by this hook: "Not configured"
 * (`checkConfigured`), "Happy path", "HTTP error" and "Network failure"
 * (`submit`'s status state machine). `postToN8n`, `readSecureItem` and the
 * settings store are mocked so this exercises only `useTracerBullet`'s own
 * logic, not real networking or secure storage — same boundary
 * `validateConnection.test.ts` draws for its own POST wrapper.
 *
 * No hook-testing library is installed in this repo, so a tiny harness
 * mounts a throwaway component with `react-test-renderer` and captures the
 * hook's latest return value into a mutable ref on every render — the same
 * mechanism `@testing-library/react-hooks`'s `renderHook` provides.
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { postToN8n } from '../../lib/api/n8nClient';
import { readSecureItem } from '../../lib/storage/secureStore';
import { useSettingsStore } from '../../store';
import { useTracerBullet, type UseTracerBulletResult } from './useTracerBullet';

jest.mock('../../lib/api/n8nClient', () => ({
  postToN8n: jest.fn(),
}));

jest.mock('../../lib/storage/secureStore', () => ({
  AUTH_SECRET_KEY: 'settings.authSecret',
  readSecureItem: jest.fn(),
}));

jest.mock('../../store', () => ({
  useSettingsStore: { getState: jest.fn() },
}));

const mockPostToN8n = postToN8n as jest.MockedFunction<typeof postToN8n>;
const mockReadSecureItem = readSecureItem as jest.MockedFunction<typeof readSecureItem>;
const mockGetState = useSettingsStore.getState as jest.MockedFunction<typeof useSettingsStore.getState>;

/**
 * `act`'s installed type declarations (`@types/react-test-renderer`) only
 * accept a void-returning callback, unlike `checkConfigured`'s
 * `Promise<boolean>` — so the result is captured via an out-param assignment
 * inside the `act` callback instead of `act`'s own (untyped) return value.
 */
async function runCheckConfigured(hook: { current: UseTracerBulletResult }): Promise<boolean> {
  let configured = false;
  await act(async () => {
    configured = await hook.current.checkConfigured();
  });
  return configured;
}

function renderTracerBulletHook(): { current: UseTracerBulletResult } {
  const ref: { current: UseTracerBulletResult } = {
    current: undefined as unknown as UseTracerBulletResult,
  };

  function Harness(): null {
    ref.current = useTracerBullet();
    return null;
  }

  act(() => {
    ReactTestRenderer.create(React.createElement(Harness));
  });

  return ref;
}

beforeEach(() => {
  mockPostToN8n.mockReset();
  mockReadSecureItem.mockReset();
  mockGetState.mockReset();
});

describe('checkConfigured', () => {
  test('returns false when webhookUrl is empty', async () => {
    mockGetState.mockReturnValue({ webhookUrl: '' } as ReturnType<typeof useSettingsStore.getState>);
    const hook = renderTracerBulletHook();

    const configured = await runCheckConfigured(hook);

    expect(configured).toBe(false);
    expect(mockReadSecureItem).not.toHaveBeenCalled();
  });

  test('returns false when webhookUrl is set but the auth secret is missing', async () => {
    mockGetState.mockReturnValue({
      webhookUrl: 'https://n8n.example.com/webhook',
    } as ReturnType<typeof useSettingsStore.getState>);
    mockReadSecureItem.mockResolvedValue(null);
    const hook = renderTracerBulletHook();

    const configured = await runCheckConfigured(hook);

    expect(configured).toBe(false);
  });

  test('returns true when both webhookUrl and the auth secret are present', async () => {
    mockGetState.mockReturnValue({
      webhookUrl: 'https://n8n.example.com/webhook',
    } as ReturnType<typeof useSettingsStore.getState>);
    mockReadSecureItem.mockResolvedValue('secret-value');
    const hook = renderTracerBulletHook();

    const configured = await runCheckConfigured(hook);

    expect(configured).toBe(true);
  });

  test('returns false when reading the secret throws', async () => {
    mockGetState.mockReturnValue({
      webhookUrl: 'https://n8n.example.com/webhook',
    } as ReturnType<typeof useSettingsStore.getState>);
    mockReadSecureItem.mockRejectedValue(new Error('secure storage unavailable'));
    const hook = renderTracerBulletHook();

    const configured = await runCheckConfigured(hook);

    expect(configured).toBe(false);
  });
});

describe('submit', () => {
  beforeEach(() => {
    mockGetState.mockReturnValue({
      webhookUrl: 'https://n8n.example.com/webhook',
    } as ReturnType<typeof useSettingsStore.getState>);
    mockReadSecureItem.mockResolvedValue('secret-value');
  });

  test('happy path: posts the text and shows the raw response', async () => {
    mockPostToN8n.mockResolvedValue({ ok: true, text: () => Promise.resolve('pong') } as unknown as Response);
    const hook = renderTracerBulletHook();

    await act(async () => hook.current.submit('hola conchi'));

    expect(mockPostToN8n).toHaveBeenCalledWith('https://n8n.example.com/webhook', 'secret-value', 'hola conchi');
    expect(hook.current.status).toBe('success');
    expect(hook.current.responseText).toBe('pong');
    expect(hook.current.errorMessage).toBeUndefined();
  });

  test('HTTP error: derives the error message from the response status', async () => {
    mockPostToN8n.mockResolvedValue({ ok: false, status: 500 } as Response);
    const hook = renderTracerBulletHook();

    await act(async () => hook.current.submit('hola conchi'));

    expect(hook.current.status).toBe('error');
    expect(hook.current.errorMessage).toContain('500');
    expect(hook.current.responseText).toBeUndefined();
  });

  test('network failure: a thrown/rejected fetch is caught and shown, not thrown', async () => {
    mockPostToN8n.mockRejectedValue(new Error('Network request failed'));
    const hook = renderTracerBulletHook();

    // A rejected `submit()` promise (rather than the internal catch handling
    // it) would make this `await` itself reject and fail the test.
    await act(async () => hook.current.submit('hola conchi'));

    expect(hook.current.status).toBe('error');
    expect(hook.current.errorMessage).toBeDefined();
  });

  test('reset returns the state machine to idle with no response/error', async () => {
    mockPostToN8n.mockResolvedValue({ ok: true, text: () => Promise.resolve('pong') } as unknown as Response);
    const hook = renderTracerBulletHook();
    await act(async () => hook.current.submit('hola conchi'));

    act(() => {
      hook.current.reset();
    });

    expect(hook.current.status).toBe('idle');
    expect(hook.current.responseText).toBeUndefined();
    expect(hook.current.errorMessage).toBeUndefined();
  });
});
