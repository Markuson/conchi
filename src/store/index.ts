/**
 * Store aggregator. This file only imports and re-exports feature slices —
 * it must never define state, selectors, or business logic of its own.
 */
export { useSettingsStore } from '../features/settings/settingsStore';
export { useReferenceDataStore } from './referenceData';
