import { AUTH_SECRET_KEY, readSecureItem } from '../storage/secureStore';
import { useSettingsStore } from '../../store';

export type ConfiguredCredentials = {
  webhookUrl: string;
  secret: string;
};

/**
 * The "sync webhookUrl + async secret presence" guard every startup flow
 * that talks to n8n needs before it can fire (Story 2.1's FCM registration,
 * Story 2.2's reference-data fetch, the tracer bullet's `checkConfigured`) —
 * previously hand-rolled once per call site. A missing/unreadable secret is
 * treated the same as "not configured" rather than thrown.
 *
 * `logPrefix` tags each skip reason with the caller's own log namespace
 * (e.g. `'fcm'`, `'referenceData'`); omit it for a silent check (e.g.
 * `checkConfigured`, which is polled on every screen focus and was never
 * logged).
 */
export async function resolveConfiguredCredentials(logPrefix?: string): Promise<ConfiguredCredentials | null> {
  const { webhookUrl } = useSettingsStore.getState();
  if (!webhookUrl) {
    if (logPrefix) {
      console.log(`[${logPrefix}] skipped: no webhookUrl configured`);
    }
    return null;
  }

  let secret: string | null;
  try {
    secret = await readSecureItem(AUTH_SECRET_KEY);
  } catch (error) {
    if (logPrefix) {
      console.log(`[${logPrefix}] skipped: secure store read failed`, error);
    }
    return null;
  }

  if (!secret) {
    if (logPrefix) {
      console.log(`[${logPrefix}] skipped: no auth secret configured`);
    }
    return null;
  }

  return { webhookUrl, secret };
}
