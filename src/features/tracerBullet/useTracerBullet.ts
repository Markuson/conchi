import { useCallback, useRef, useState } from 'react';

import { joinWebhookUrl, postToN8n } from '../../lib/api/n8nClient';
import { SEND_EXPENSE_PATH } from '../../lib/constants';
import { AUTH_SECRET_KEY, readSecureItem } from '../../lib/storage/secureStore';
import { useSettingsStore } from '../../store';

/**
 * `'idle'` before any submit; `'submitting'` while the request is in flight;
 * `'success'`/`'error'` after it settles. `TracerBulletModal` re-declares this
 * union locally rather than importing it (AD-2: components must not import
 * from `src/features/**`).
 */
export type TracerBulletStatus = 'idle' | 'submitting' | 'success' | 'error';

export type UseTracerBulletResult = {
  status: TracerBulletStatus;
  responseText: string | undefined;
  errorMessage: string | undefined;
  /** Sync `webhookUrl` + async secret presence check — no network call. */
  checkConfigured: () => Promise<boolean>;
  submit: (text: string) => Promise<void>;
  reset: () => void;
};

/**
 * Story 1.6's tracer-bullet business logic: is a connection configured, and
 * posting typed text to n8n via the shared `postToN8n` client (AD-5: every
 * request carries the bearer secret, injected there, never rebuilt here).
 * The only file in `features/tracerBullet` holding business logic —
 * `TracerBulletModal` stays presentational.
 */
export function useTracerBullet(): UseTracerBulletResult {
  const [status, setStatus] = useState<TracerBulletStatus>('idle');
  const [responseText, setResponseText] = useState<string | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  /** Bumped on every `reset()` so a stale in-flight `submit()` can tell its result no longer applies. */
  const generationRef = useRef(0);

  const checkConfigured = useCallback(async (): Promise<boolean> => {
    const { webhookUrl } = useSettingsStore.getState();
    if (!webhookUrl) {
      return false;
    }

    let secret: string | null;
    try {
      secret = await readSecureItem(AUTH_SECRET_KEY);
    } catch {
      // Secure storage unavailable — treat the same as "not configured"
      // rather than throwing out of a guard check.
      return false;
    }

    return Boolean(secret);
  }, []);

  const submit = useCallback(async (text: string): Promise<void> => {
    const { webhookUrl } = useSettingsStore.getState();
    const generation = ++generationRef.current;
    const isStale = (): boolean => generation !== generationRef.current;

    setStatus('submitting');
    setErrorMessage(undefined);
    setResponseText(undefined);

    let secret: string | null;
    try {
      secret = await readSecureItem(AUTH_SECRET_KEY);
    } catch {
      if (!isStale()) {
        setStatus('error');
        setErrorMessage("No s'ha pogut llegir el secret desat.");
      }
      return;
    }

    if (!secret) {
      if (!isStale()) {
        setStatus('error');
        setErrorMessage("No s'ha pogut llegir el secret desat.");
      }
      return;
    }

    try {
      const response = await postToN8n(joinWebhookUrl(webhookUrl, SEND_EXPENSE_PATH), secret, text);
      if (!response.ok) {
        if (!isStale()) {
          setStatus('error');
          setErrorMessage(`El servidor ha retornat un error (${response.status}).`);
        }
        return;
      }

      const raw = await response.text();
      if (!isStale()) {
        setResponseText(raw);
        setStatus('success');
      }
    } catch {
      if (!isStale()) {
        setStatus('error');
        setErrorMessage("No s'ha pogut connectar. Comprova la connexió i torna-ho a provar.");
      }
    }
  }, []);

  const reset = useCallback((): void => {
    generationRef.current += 1;
    setStatus('idle');
    setResponseText(undefined);
    setErrorMessage(undefined);
  }, []);

  return { status, responseText, errorMessage, checkConfigured, submit, reset };
}
