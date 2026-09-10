/**
 * Minimal coverage for `postToN8n` — the only place in the repo that builds
 * the `Authorization: Bearer <secret>` header every n8n request must carry
 * (AD-5). `validateConnection.test.ts` mocks this module entirely, so this is
 * the one place the real header-building logic actually runs under test.
 */
import { postToN8n } from './n8nClient';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

test('POSTs to the given URL with a Bearer auth header and JSON body', async () => {
  const mockFetch = jest.fn<Promise<Response>, Parameters<typeof fetch>>().mockResolvedValue({ ok: true } as Response);
  global.fetch = mockFetch;

  await postToN8n('https://n8n.example.com/webhook', 'my-secret', { foo: 'bar' });

  expect(mockFetch).toHaveBeenCalledTimes(1);
  const [calledUrl, calledInit] = mockFetch.mock.calls[0];
  expect(calledUrl).toBe('https://n8n.example.com/webhook');
  expect(calledInit?.method).toBe('POST');
  expect(calledInit?.headers).toEqual({ Authorization: 'Bearer my-secret', 'Content-Type': 'application/json' });
  expect(calledInit?.body).toBe(JSON.stringify({ foo: 'bar' }));
});

test('passes an AbortSignal so a hung request can be cancelled', async () => {
  const mockFetch = jest.fn<Promise<Response>, Parameters<typeof fetch>>().mockResolvedValue({ ok: true } as Response);
  global.fetch = mockFetch;

  await postToN8n('https://n8n.example.com/webhook', 'my-secret', {});

  const [, calledInit] = mockFetch.mock.calls[0];
  expect(calledInit?.signal).toBeInstanceOf(AbortSignal);
  expect(calledInit?.signal?.aborted).toBe(false);
});

test('aborts the request once the timeout elapses, so a hang surfaces as a rejection', async () => {
  jest.useFakeTimers();
  try {
    // Mimics real `fetch`'s abort behavior (the mock above doesn't need to,
    // since it resolves immediately) — rejects once the passed-in signal aborts.
    const mockFetch = jest.fn<Promise<Response>, Parameters<typeof fetch>>().mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new Error('The operation was aborted'));
          });
        }),
    );
    global.fetch = mockFetch;

    const pending = postToN8n('https://n8n.example.com/webhook', 'my-secret', {});
    const assertion = expect(pending).rejects.toThrow('The operation was aborted');

    jest.advanceTimersByTime(15000);

    await assertion;
  } finally {
    jest.useRealTimers();
  }
});
