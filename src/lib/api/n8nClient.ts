/**
 * Minimal n8n HTTP client. First networking code in the repo — seeds the
 * `lib/api/` location the architecture spine reserves for the n8n client
 * (ARCHITECTURE-SPINE.md source-tree section). Every n8n request carries
 * `Authorization: Bearer <secret>` (AD-5); this module owns that header
 * injection so callers never build it themselves.
 */

/**
 * Without a timeout, a hung n8n endpoint would leave `fetch()` neither
 * resolving nor rejecting — `validateConnection`'s caller (`handleAccept`)
 * would then sit in `status: 'saving'` forever with no error ever shown,
 * contradicting the "Network failure/timeout → descriptive error" I/O-matrix
 * row. An `AbortController` + `setTimeout` (rather than the newer
 * `AbortSignal.timeout` static, whose Hermes/RN support isn't guaranteed
 * here) turns a hang into a real `AbortError` rejection, which
 * `validateConnection`'s existing `catch` already maps to `reason: 'network'`.
 */
const REQUEST_TIMEOUT_MS = 15000;

export async function postToN8n(url: string, secret: string, body: unknown): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
