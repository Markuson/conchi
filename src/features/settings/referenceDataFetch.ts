import { joinWebhookUrl, postToN8n } from '../../lib/api/n8nClient';
import { resolveConfiguredCredentials, type ConfiguredCredentials } from '../../lib/api/connection';
import { CATEGORIES_PATH, REFERENCE_DATA_RETRY_DELAY_MS } from '../../lib/constants';
import { setObject } from '../../lib/storage/mmkv';
import type { Category } from '../../lib/types';
import { REFERENCE_DATA_KEY, setReferenceData, type ReferenceDataState } from '../../store/referenceData';

/**
 * Populates `useReferenceDataStore` from n8n on startup (Story 2.2). The
 * only file outside `store/referenceData.ts` allowed to call
 * `setReferenceData` (AD-16, enforced by the `no-restricted-imports`
 * override in `.eslintrc.js`).
 *
 * A fetch failure (network error, non-2xx, an unparseable body, or a body
 * whose `categories` don't match `ReferenceDataState`'s shape — the
 * `/get-categories` contract is an unverified assumption, see
 * `docs/docs/n8n-webhook-setup.md`) never throws — the existing
 * cached/empty store state stays visible, and exactly one retry is
 * scheduled via `REFERENCE_DATA_RETRY_DELAY_MS`. The retry itself never
 * schedules a further retry, so a persistent outage logs twice and then
 * goes quiet rather than polling forever.
 *
 * Reentrant-safe: overlapping calls (this is exported specifically so a
 * future refresh trigger, e.g. a Settings-save action, can call it again
 * while a startup fetch or its pending retry is still in flight) reuse the
 * one in-flight attempt instead of racing a second network call and a
 * second retry timer.
 *
 * `credentials` lets a caller that already resolved
 * `resolveConfiguredCredentials` itself (`App.tsx`'s startup effect, so it
 * doesn't also perform its own secure-storage read for the exact same
 * webhookUrl+secret pair) pass it straight through. Omit it to have this
 * function resolve its own — every retry always does, since the delay
 * between attempts means a caller-supplied pair could be stale by then.
 */
export function fetchReferenceData(credentials?: ConfiguredCredentials): Promise<void> {
  if (inFlightFetch) {
    return inFlightFetch;
  }
  if (pendingRetryTimeout) {
    clearTimeout(pendingRetryTimeout);
    pendingRetryTimeout = null;
  }
  inFlightFetch = runFetch(0, credentials).finally(() => {
    inFlightFetch = null;
  });
  return inFlightFetch;
}

/** Initial attempt + exactly one retry — see `fetchReferenceData`'s doc comment. */
const MAX_ATTEMPTS = 2;

let inFlightFetch: Promise<void> | null = null;
let pendingRetryTimeout: ReturnType<typeof setTimeout> | null = null;

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
 * Guards the parsed n8n response's `categories` against `Category[]`'s shape
 * before it's ever cached or written to the store — `categories` is the
 * only field Story 2.3 actually reads. Without this, a malformed or
 * field-renamed response from a real (unverified) n8n workflow would parse
 * as valid JSON and get cast straight through — silently persisting bad
 * data into MMKV and the live store instead of being treated as the fetch
 * failure it actually is.
 */
function isCategoriesResponse(value: unknown): value is { categories: Category[] } {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const { categories } = value as { categories?: unknown };
  return Array.isArray(categories) && categories.every(isCategory);
}

/**
 * `contexts` has no write path yet (Epic 5) — nothing populates or edits it
 * beyond what n8n returns, and a real workflow may well omit it entirely
 * until then. Treated leniently (missing/malformed → `[]`) rather than as
 * part of the required response shape, so an incomplete `contexts` field
 * never drags down the `categories` Story 2.3 actually needs.
 */
function extractContexts(value: unknown): string[] {
  if (!value || typeof value !== 'object') {
    return [];
  }
  const { contexts } = value as { contexts?: unknown };
  if (!Array.isArray(contexts) || !contexts.every((c) => typeof c === 'string')) {
    return [];
  }
  return contexts;
}

async function runFetch(attempt: number, presetCredentials?: ConfiguredCredentials): Promise<void> {
  const credentials = presetCredentials ?? (await resolveConfiguredCredentials('referenceData'));
  if (!credentials) {
    return;
  }
  const { webhookUrl, secret } = credentials;

  try {
    const response = await postToN8n(joinWebhookUrl(webhookUrl, CATEGORIES_PATH), secret, {});
    if (!response.ok) {
      console.log(`[referenceData] fetch failed: HTTP ${response.status}`);
      retryIfPossible(attempt);
      return;
    }

    const parsed: unknown = await response.json();
    if (!isCategoriesResponse(parsed)) {
      console.log('[referenceData] fetch failed: response did not match the expected shape');
      retryIfPossible(attempt);
      return;
    }

    const data: ReferenceDataState = { categories: parsed.categories, contexts: extractContexts(parsed) };

    // The in-memory store update is not gated by the MMKV cache write below
    // — a fetch that succeeded with valid data must never be treated as a
    // failure (and retried) just because the cache write itself failed. The
    // cache write is best-effort: its own failure is logged but doesn't
    // undo the successful in-memory update or trigger a retry.
    setReferenceData(data);
    try {
      setObject(REFERENCE_DATA_KEY, data);
    } catch (error) {
      console.log('[referenceData] cache write failed', error);
    }
  } catch (error) {
    console.log('[referenceData] fetch failed', error);
    retryIfPossible(attempt);
  }
}

function retryIfPossible(attempt: number): void {
  if (attempt + 1 >= MAX_ATTEMPTS) {
    return;
  }
  pendingRetryTimeout = setTimeout(() => {
    pendingRetryTimeout = null;
    inFlightFetch = runFetch(attempt + 1).finally(() => {
      inFlightFetch = null;
    });
  }, REFERENCE_DATA_RETRY_DELAY_MS);
}
