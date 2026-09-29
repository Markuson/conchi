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
