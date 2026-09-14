/**
 * Cross-story, compile-time constants.
 *
 * `IS_DETOX` is the single source of truth for "are we running under Detox".
 * Anything that needs to disable animations, timers, or other non-deterministic
 * behaviour for E2E tests reads this flag — never `process.env.DETOX_TEST` directly.
 */
export const IS_DETOX = process.env['DETOX_TEST'] === 'true';

/**
 * Story 2.1 (FCM spike): path appended to the Settings `webhookUrl` to build the
 * device-token registration endpoint (`{webhookUrl}${FCM_REGISTER_PATH}`). This is
 * the first call site to treat `webhookUrl` as a base rather than a literal,
 * full endpoint (AD-15 going forward) — the existing tracer-bullet call site
 * (Story 1.6) keeps posting to `webhookUrl` as-is until Story 2.4.
 */
export const FCM_REGISTER_PATH = '/register-token';
