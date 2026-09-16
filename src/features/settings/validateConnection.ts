import { joinWebhookUrl, postToN8n } from '../../lib/api/n8nClient';
import { SEND_EXPENSE_PATH } from '../../lib/constants';

export type ValidateConnectionResult = { ok: true } | { ok: false; reason: 'format' | 'network' | 'http' };

/** `http://` or `https://` scheme required — checked before any network call. */
const URL_SCHEME_RE = /^https?:\/\//i;

/**
 * Validates an n8n connection: a client-side URL-format check, then a ping
 * POST (empty JSON body — Story 1.6 defines the real entry-submission body
 * shape on top of the same `postToN8n` client) against the same
 * `{url}/send-expense` route the tracer bullet posts real text to — `url`
 * alone (the bare `webhookUrl` base) isn't a real n8n route. Returns a
 * discriminated result rather than throwing, so the screen can render each
 * I/O-matrix branch (format / network / http) without its own try/catch.
 */
export async function validateConnection(url: string, secret: string): Promise<ValidateConnectionResult> {
  if (!URL_SCHEME_RE.test(url)) {
    return { ok: false, reason: 'format' };
  }

  let response: Response;
  try {
    response = await postToN8n(joinWebhookUrl(url, SEND_EXPENSE_PATH), secret, {});
  } catch {
    return { ok: false, reason: 'network' };
  }

  if (!response.ok) {
    return { ok: false, reason: 'http' };
  }

  return { ok: true };
}
