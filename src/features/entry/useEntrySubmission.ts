import { useCallback, useEffect, useRef, useState } from 'react';

import { resolveConfiguredCredentials } from '../../lib/api/connection';
import { joinWebhookUrl, postToN8n } from '../../lib/api/n8nClient';
import { PHASE2_TIMEOUT_MS, SAVE_ENTRY_PATH, SEND_EXPENSE_PATH } from '../../lib/constants';
import { roundTripError } from '../../lib/conchiCopy';
import { AUTH_SECRET_KEY, readSecureItem } from '../../lib/storage/secureStore';
import { useSettingsStore } from '../../store';
import type { ConfirmationCardData } from '../../components/ConfirmationCard';
import type { Entry } from '../../lib/types/entry';

/**
 * `'idle'` before any submit, or after a confirmation has been
 * accepted/discarded; `'submitting'` while Phase 1's POST is in flight;
 * `'waiting'` for Phase 2 (awaiting the FCM `round_trip_result`); `'error'`
 * on a Phase 1 failure or Phase 2 timeout (`errorMessage` carries the
 * specific message); `'ready'` once a result has arrived and
 * `ConfirmationCard` should mount. Mirrors `useTracerBullet`'s own local
 * status-union pattern rather than a shared `AppError` type (no such type
 * exists project-wide yet — see this story's spec Design Notes).
 */
export type EntrySubmissionStatus = 'idle' | 'submitting' | 'waiting' | 'error' | 'ready';

export type SaveStatus = 'idle' | 'saving' | 'error';

export type UseEntrySubmissionResult = {
  status: EntrySubmissionStatus;
  errorMessage: string | undefined;
  /** Conchita's round-trip result, mapped from the FCM `entry` payload — present once `status === 'ready'`. */
  entryResult: ConfirmationCardData | undefined;
  saveStatus: SaveStatus;
  saveErrorMessage: string | undefined;
  /** Sync `webhookUrl` + async secret presence check — no network call. */
  checkConfigured: () => Promise<boolean>;
  /** Phase 1: POSTs `text` to n8n, then (on success) starts Phase 2's `PHASE2_TIMEOUT_MS`-bounded wait. */
  submit: (text: string) => Promise<void>;
  /** Re-POSTs the last `submit()`'s text — the overlay preserves it, so no argument is needed here. */
  retry: () => Promise<void>;
  /** Back to `'idle'` with everything cleared — used on Discard, on closing the overlay, and before a fresh FAB-press submission. */
  reset: () => void;
  /** Acceptar's save POST. Resolves `true` on success (caller should then `reset()`), `false` on failure (caller keeps the card open and shows `saveErrorMessage`). */
  saveEntry: (data: ConfirmationCardData) => Promise<boolean>;
  /**
   * Fed the `entry` from a foreground `round_trip_result` FCM message —
   * dispatched by `App.tsx`'s existing `onForegroundMessage` subscription
   * (reused as-is, not duplicated here). A no-op unless this hook is
   * currently `'waiting'` on it.
   */
  handleRoundTripResult: (entry: Entry) => void;
};

function mapEntryToConfirmationCardData(entry: Entry): ConfirmationCardData {
  return {
    amount: entry.amount,
    currency: entry.currency,
    category: entry.category,
    subcategory: entry.subcategory,
    description: entry.description,
    date: entry.date,
    context: entry.context,
  };
}

/**
 * Story 2.4's core orchestration hook: the real two-phase round trip
 * (Phase 1 POST to n8n, Phase 2 wait for the FCM result) that replaces
 * Story 1.6's tracer bullet. Mirrors `useTracerBullet`'s generation-counter
 * staleness guard and its `postToN8n`/`resolveConfiguredCredentials` usage,
 * extended with a second phase and the Acceptar save POST.
 */
export function useEntrySubmission(): UseEntrySubmissionResult {
  const [status, setStatus] = useState<EntrySubmissionStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [entryResult, setEntryResult] = useState<ConfirmationCardData | undefined>(undefined);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | undefined>(undefined);

  /**
   * Bumped on every `reset()`/new `submit()` so a stale Phase 1 response, a
   * stale Phase 2 timeout, or a late `handleRoundTripResult` call (from a
   * submission the user has since abandoned) can tell its result no longer
   * applies — the same guard `useTracerBullet.submit` uses for its single
   * phase, extended to cover both of this hook's phases.
   */
  const generationRef = useRef(0);
  /**
   * Mirrors `status` for `handleRoundTripResult` to read synchronously.
   * `handleRoundTripResult` is exposed with a stable identity (empty
   * `useCallback` deps) so `App.tsx`'s one-time FCM-subscription effect
   * never needs to re-subscribe when this hook's own state changes; reading
   * `status` directly there would close over a stale value instead.
   */
  const statusRef = useRef<EntrySubmissionStatus>('idle');
  /** Mirrors `saveStatus` so `saveEntry` can synchronously reject a re-entrant call before its own first `await`, the same pattern `statusRef` gives `runSubmit`. */
  const saveStatusRef = useRef<SaveStatus>('idle');
  const lastTextRef = useRef('');
  const phase2TimeoutIdRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const clearPhase2Timeout = (): void => {
    if (phase2TimeoutIdRef.current !== undefined) {
      clearTimeout(phase2TimeoutIdRef.current);
      phase2TimeoutIdRef.current = undefined;
    }
  };

  const setStatusBoth = (next: EntrySubmissionStatus): void => {
    statusRef.current = next;
    setStatus(next);
  };

  const setSaveStatusBoth = (next: SaveStatus): void => {
    saveStatusRef.current = next;
    setSaveStatus(next);
  };

  const checkConfigured = useCallback(async (): Promise<boolean> => {
    // No `logPrefix` — mirrors `useTracerBullet.checkConfigured`, polled on
    // every FAB press without its own logging.
    return Boolean(await resolveConfiguredCredentials());
  }, []);

  const runSubmit = useCallback(async (text: string): Promise<void> => {
    // A second submission is blocked while Phase 1 or Phase 2 is in flight
    // (this story's frozen boundary) — enforced here, not just by the
    // overlay disabling its own submit button.
    if (statusRef.current === 'submitting' || statusRef.current === 'waiting') {
      return;
    }

    const { webhookUrl } = useSettingsStore.getState();
    const generation = ++generationRef.current;
    const isStale = (): boolean => generation !== generationRef.current;

    clearPhase2Timeout();
    lastTextRef.current = text;
    setStatusBoth('submitting');
    setErrorMessage(undefined);
    setEntryResult(undefined);
    setSaveStatusBoth('idle');
    setSaveErrorMessage(undefined);

    let secret: string | null;
    try {
      secret = await readSecureItem(AUTH_SECRET_KEY);
    } catch {
      if (!isStale()) {
        setStatusBoth('error');
        setErrorMessage("No s'ha pogut llegir el secret desat.");
      }
      return;
    }

    if (!secret) {
      if (!isStale()) {
        setStatusBoth('error');
        setErrorMessage("No s'ha pogut llegir el secret desat.");
      }
      return;
    }

    try {
      const response = await postToN8n(joinWebhookUrl(webhookUrl, SEND_EXPENSE_PATH), secret, text);
      if (!response.ok) {
        if (!isStale()) {
          setStatusBoth('error');
          setErrorMessage(`El servidor ha retornat un error (${response.status}).`);
        }
        return;
      }
    } catch {
      if (!isStale()) {
        setStatusBoth('error');
        setErrorMessage("No s'ha pogut connectar. Comprova la connexió i torna-ho a provar.");
      }
      return;
    }

    if (isStale()) {
      return;
    }

    // Phase 1 succeeded -- Phase 2 begins: wait for the FCM round_trip_result
    // (delivered via `handleRoundTripResult`), bounded by PHASE2_TIMEOUT_MS
    // so a lost/delayed push never leaves the Bubble stuck on Working forever.
    setStatusBoth('waiting');
    phase2TimeoutIdRef.current = setTimeout(() => {
      if (!isStale()) {
        setStatusBoth('error');
        setErrorMessage(roundTripError);
      }
    }, PHASE2_TIMEOUT_MS);
  }, []);

  const submit = useCallback((text: string): Promise<void> => runSubmit(text), [runSubmit]);
  const retry = useCallback((): Promise<void> => runSubmit(lastTextRef.current), [runSubmit]);

  const reset = useCallback((): void => {
    generationRef.current += 1;
    clearPhase2Timeout();
    setStatusBoth('idle');
    setErrorMessage(undefined);
    setEntryResult(undefined);
    setSaveStatusBoth('idle');
    setSaveErrorMessage(undefined);
  }, []);

  const handleRoundTripResult = useCallback((entry: Entry): void => {
    // Temporary debug logging (real-device FCM round-trip verification in
    // progress) -- remove once the n8n -> app delivery is confirmed working.
    console.log('[entry] handleRoundTripResult called, current status:', statusRef.current, 'raw entry:', entry);
    if (statusRef.current !== 'waiting') {
      return;
    }
    clearPhase2Timeout();
    const mapped = mapEntryToConfirmationCardData(entry);
    console.log('[entry] mapped ConfirmationCardData:', mapped);
    setEntryResult(mapped);
    setStatusBoth('ready');
  }, []);

  const saveEntry = useCallback(async (data: ConfirmationCardData): Promise<boolean> => {
    // Blocks a re-entrant call (e.g. a double-tapped Acceptar) from firing a
    // second concurrent save POST while the first is still in flight —
    // mirrors `runSubmit`'s synchronous ref-check guard above.
    if (saveStatusRef.current === 'saving') {
      return false;
    }

    const { webhookUrl } = useSettingsStore.getState();
    setSaveStatusBoth('saving');
    setSaveErrorMessage(undefined);

    let secret: string | null;
    try {
      secret = await readSecureItem(AUTH_SECRET_KEY);
    } catch {
      setSaveStatusBoth('error');
      setSaveErrorMessage("No s'ha pogut llegir el secret desat.");
      return false;
    }

    if (!secret) {
      setSaveStatusBoth('error');
      setSaveErrorMessage("No s'ha pogut llegir el secret desat.");
      return false;
    }

    try {
      const response = await postToN8n(joinWebhookUrl(webhookUrl, SAVE_ENTRY_PATH), secret, data);
      if (!response.ok) {
        setSaveStatusBoth('error');
        setSaveErrorMessage(`El servidor ha retornat un error (${response.status}).`);
        return false;
      }
    } catch {
      setSaveStatusBoth('error');
      setSaveErrorMessage("No s'ha pogut connectar. Comprova la connexió i torna-ho a provar.");
      return false;
    }

    setSaveStatusBoth('idle');
    return true;
  }, []);

  // Phase 2's timer must not outlive the component that owns it.
  useEffect(() => {
    return clearPhase2Timeout;
  }, []);

  return {
    status,
    errorMessage,
    entryResult,
    saveStatus,
    saveErrorMessage,
    checkConfigured,
    submit,
    retry,
    reset,
    saveEntry,
    handleRoundTripResult,
  };
}
