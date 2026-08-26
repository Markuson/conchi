/**
 * Cross-story, compile-time constants.
 *
 * `IS_DETOX` is the single source of truth for "are we running under Detox".
 * Anything that needs to disable animations, timers, or other non-deterministic
 * behaviour for E2E tests reads this flag — never `process.env.DETOX_TEST` directly.
 */
export const IS_DETOX = process.env['DETOX_TEST'] === 'true';
