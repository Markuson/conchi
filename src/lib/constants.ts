/**
 * Cross-story, compile-time constants.
 *
 * `IS_DETOX` is the single source of truth for "are we running under Detox".
 * Anything that needs to disable animations, timers, or other non-deterministic
 * behaviour for E2E tests reads this flag — never `process.env.DETOX_TEST` directly.
 */
export const IS_DETOX = process.env['DETOX_TEST'] === 'true';

/**
 * Endpoint-specific paths joined onto the Settings `webhookUrl` (a base —
 * n8n's own `.../webhook` production prefix, per AD-15) via `joinWebhookUrl`.
 * `webhookUrl` alone is never a real n8n route; every caller appends one of
 * these. `SEND_EXPENSE_PATH` also backs `validateConnection`'s ping, since
 * that's the same n8n node the tracer bullet posts real text to.
 */
export const FCM_REGISTER_PATH = '/register-token';
export const SEND_EXPENSE_PATH = '/send-expense';
export const CATEGORIES_PATH = '/get-categories';
/**
 * Acceptar's save-POST endpoint (Story 2.4): confirms/persists the
 * (possibly edited) Confirmation Card data once the user accepts Conchita's
 * round-trip result. The field-level payload contract isn't documented yet
 * (`docs/docs/api-contracts.md` is deferred — see `deferred-work.md`); verify
 * manually against a real n8n workflow at this path before relying on it.
 */
export const SAVE_ENTRY_PATH = '/save-entry';

/**
 * Delay before `fetchReferenceData`'s single retry after a failed fetch
 * (Story 2.2). Named so the retry timing is a documented, greppable
 * constant rather than a magic number buried in `setTimeout`.
 */
export const REFERENCE_DATA_RETRY_DELAY_MS = 5000;

/**
 * Bounds Phase 2 of Story 2.4's text-entry round trip: how long
 * `useEntrySubmission` waits for n8n's FCM `round_trip_result` push after
 * Phase 1's POST succeeds, before giving up and surfacing a timeout error to
 * the Conchi Bubble. Named per this story's own frozen boundary ("never an
 * inline magic number").
 */
export const PHASE2_TIMEOUT_MS = 60000;
