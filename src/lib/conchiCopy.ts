/**
 * Conchi's personality copy — plain named-export constants, mirroring
 * `constants.ts`'s style (no i18n framework exists yet in this codebase;
 * every other UI string in the app is a plain Catalan literal too, see
 * `TracerBulletModal.tsx`).
 *
 * `roundTripSuccess` backs the Confirmation Card's "Conchi quote" line
 * (`typography.conchiQuote`) — one entry is picked at random each time the
 * card mounts. Placeholder copy; real personality lines are a later story's
 * content pass.
 */
export const roundTripSuccess: string[] = [
  'Apuntat! Una despesa menys per oblidar.',
  "Fet i fet. La comptabilitat no s'escriu sola... o sí?",
  'Ja ho tinc anotat. Segueix així!',
  'Un altre moviment registrat. Bon ritme avui.',
  "Anotat al cèntim. No se m'escapa res.",
  "Llest! Torna quan vulguis, aquí t'espero.",
];

/**
 * Story 2.4's Error-state copy: shown whenever `useEntrySubmission`'s round
 * trip fails (Phase 1 POST failure or a Phase 2 `PHASE2_TIMEOUT_MS` timeout)
 * and surfaced via `ConchiBubble`'s accessibility label while
 * `state === 'error'` — the Bubble itself has no text UI, so this is how the
 * failure reaches assistive technology; sighted users read it from the
 * Bubble's `conchi-error.png` art switching in.
 */
export const roundTripError = 'Alguna cosa ha anat malament. Torna-ho a provar.';
