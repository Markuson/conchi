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
