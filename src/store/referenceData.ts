import { create } from 'zustand';

/**
 * Shared, read-only reference data (categories / subcategories / contexts).
 * `src/features/settings/` is the sole writer of this slice; every other
 * feature only reads from it. Populated for real in Epic 2 — stubbed empty here.
 */
type ReferenceDataState = {
  categories: string[];
  subcategories: string[];
  contexts: string[];
  setReferenceData: (data: Partial<Omit<ReferenceDataState, 'setReferenceData'>>) => void;
};

export const useReferenceDataStore = create<ReferenceDataState>((set) => ({
  categories: [],
  subcategories: [],
  contexts: [],
  setReferenceData: (data) => set((state) => ({ ...state, ...data })),
}));
