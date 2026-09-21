import { joinWebhookUrl, postToN8n } from '../../lib/api/n8nClient';
import { CATEGORIES_PATH, REFERENCE_DATA_RETRY_DELAY_MS } from '../../lib/constants';
import { AUTH_SECRET_KEY, readSecureItem } from '../../lib/storage/secureStore';
import { setObject } from '../../lib/storage/mmkv';
import type { Category } from '../../lib/types';
import { useSettingsStore } from '../../store';
import { CATEGORIES_KEY, CONTEXTS_KEY, setReferenceData, type ReferenceDataState } from '../../store/referenceData';

/**
 * Populates `useReferenceDataStore` from n8n on startup (Story 2.2). The
 * only file outside `store/referenceData.ts` allowed to call
 * `setReferenceData` (AD-16, enforced by the `no-restricted-imports`
 * override in `.eslintrc.js`).
 *
 * Mirrors `App.tsx`'s Story 2.1 FCM startup effect's "sync webhookUrl +
 * async secret presence" guard (`checkConfigured` in
 * `useTracerBullet.ts`) rather than reusing that hook, and reuses
 * `postToN8n`/`joinWebhookUrl` unchanged so the bearer header (AD-5) is
 * never rebuilt here.
 *
 * A fetch failure (network error, non-2xx, an unparseable body, or a body
 * that parses but doesn't match `ReferenceDataState`'s shape — the
 * `/get-categories` contract is an unverified assumption, see
 * `docs/docs/n8n-webhook-setup.md`) never throws — the existing
 * cached/empty store state stays visible, and exactly one retry is
 * scheduled via `REFERENCE_DATA_RETRY_DELAY_MS`. The retry itself never
 * schedules a further retry, so a persistent outage logs twice and then
 * goes quiet rather than polling forever.
 */
export async function fetchReferenceData(): Promise<void> {
  await attemptFetch(false);
}

function isCategory(value: unknown): value is Category {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const { name, subcategories } = value as { name?: unknown; subcategories?: unknown };
  return (
    typeof name === 'string' && Array.isArray(subcategories) && subcategories.every((s) => typeof s === 'string')
  );
}

/**
 * Guards the parsed n8n response against `ReferenceDataState`'s shape before
 * it's ever cached or written to the store. Without this, a malformed or
 * field-renamed response from a real (unverified) n8n workflow would parse
 * as valid JSON and get cast straight through — silently persisting bad
 * data into MMKV and the live store instead of being treated as the fetch
 * failure it actually is.
 */
function isReferenceDataResponse(value: unknown): value is ReferenceDataState {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const { categories, contexts } = value as { categories?: unknown; contexts?: unknown };
  return (
    Array.isArray(categories) &&
    categories.every(isCategory) &&
    Array.isArray(contexts) &&
    contexts.every((c) => typeof c === 'string')
  );
}

async function attemptFetch(isRetry: boolean): Promise<void> {
  const { webhookUrl } = useSettingsStore.getState();
  if (!webhookUrl) {
    console.log('[referenceData] skipped: no webhookUrl configured');
    return;
  }

  let secret: string | null;
  try {
    secret = await readSecureItem(AUTH_SECRET_KEY);
  } catch (error) {
    console.log('[referenceData] skipped: secure store read failed', error);
    return;
  }
  if (!secret) {
    console.log('[referenceData] skipped: no auth secret configured');
    return;
  }

  try {
    const response = await postToN8n(joinWebhookUrl(webhookUrl, CATEGORIES_PATH), secret, {});
    if (!response.ok) {
      console.log(`[referenceData] fetch failed: HTTP ${response.status}`);
      scheduleRetry(isRetry);
      return;
    }

    // Identical to the store's own shape (Design Notes) — no translation
    // layer between the n8n response and `setReferenceData`'s argument,
    // beyond the runtime shape check below.
    const parsed: unknown = await response.json();
    if (!isReferenceDataResponse(parsed)) {
      console.log('[referenceData] fetch failed: response did not match the expected shape');
      scheduleRetry(isRetry);
      return;
    }

    // The in-memory store update is not gated by the MMKV cache writes
    // below — a fetch that succeeded with valid data must never be treated
    // as a failure (and retried) just because the cache write itself
    // failed. The cache write is best-effort: its own failure is logged but
    // doesn't undo the successful in-memory update or trigger a retry.
    setReferenceData(parsed);
    try {
      setObject(CATEGORIES_KEY, parsed.categories);
      setObject(CONTEXTS_KEY, parsed.contexts);
    } catch (error) {
      console.log('[referenceData] cache write failed', error);
    }
  } catch (error) {
    console.log('[referenceData] fetch failed', error);
    scheduleRetry(isRetry);
  }
}

function scheduleRetry(isRetry: boolean): void {
  // Only the first attempt schedules a retry — the retry's own failure is
  // logged (above) but not retried again, per the I/O matrix's "one retry".
  if (isRetry) {
    return;
  }
  setTimeout(() => {
    void attemptFetch(true);
  }, REFERENCE_DATA_RETRY_DELAY_MS);
}
