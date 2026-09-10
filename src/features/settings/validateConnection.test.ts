/**
 * Covers the I/O & Edge-Case Matrix rows for `validateConnection`: invalid URL
 * format (no network call), HTTP 200, HTTP error status, and a network throw.
 * `postToN8n` is mocked so these tests exercise only the format check +
 * result-branching logic, not real networking (that's `n8nClient`'s job).
 */
import { postToN8n } from '../../lib/api/n8nClient';
import { validateConnection } from './validateConnection';

jest.mock('../../lib/api/n8nClient', () => ({
  postToN8n: jest.fn(),
}));

const mockPostToN8n = postToN8n as jest.MockedFunction<typeof postToN8n>;

beforeEach(() => {
  mockPostToN8n.mockReset();
});

test('rejects a URL with no http(s) scheme without making a network call', async () => {
  const result = await validateConnection('example.com/webhook', 'secret');

  expect(result).toEqual({ ok: false, reason: 'format' });
  expect(mockPostToN8n).not.toHaveBeenCalled();
});

test('accepts an HTTP 200 response', async () => {
  mockPostToN8n.mockResolvedValue({ ok: true } as Response);

  const result = await validateConnection('https://n8n.example.com/webhook', 'secret');

  expect(result).toEqual({ ok: true });
  expect(mockPostToN8n).toHaveBeenCalledWith('https://n8n.example.com/webhook', 'secret', {});
});

test('reports an "http" reason on a non-2xx response', async () => {
  mockPostToN8n.mockResolvedValue({ ok: false, status: 401 } as Response);

  const result = await validateConnection('https://n8n.example.com/webhook', 'secret');

  expect(result).toEqual({ ok: false, reason: 'http' });
});

test('reports a "network" reason when the request throws', async () => {
  mockPostToN8n.mockRejectedValue(new Error('Network request failed'));

  const result = await validateConnection('https://n8n.example.com/webhook', 'secret');

  expect(result).toEqual({ ok: false, reason: 'network' });
});

test('accepts an http:// (not just https://) URL format', async () => {
  mockPostToN8n.mockResolvedValue({ ok: true } as Response);

  const result = await validateConnection('http://localhost:5678/webhook', 'secret');

  expect(result).toEqual({ ok: true });
});
