import { create } from 'zustand';

import { getObject } from '../lib/storage/mmkv';
import type { Category } from '../lib/types';

/**
 * Shared, read-only reference data (categories → subcategories, plus
 * contexts). `src/features/settings/` is the sole writer of this slice
 * (AD-16) — `setReferenceData` is exported separately below, outside the
 * hook's returned state, specifically so the ESLint `no-restricted-imports`
 * `importNames` rule in `.eslintrc.js` can target it by name; folding it
 * into the hook's state would make every reader import it too, and the
 * restriction unenforceable. Every other feature only reads
 * `categories`/`contexts` via `useReferenceDataStore`.
 */
export type ReferenceDataState = {
  categories: Category[];
  contexts: string[];
};

/**
 * Exported (unlike `settingsStore.ts`'s equivalent keys) so
 * `features/settings/referenceDataFetch.ts` writes the exact same MMKV keys
 * this store hydrates from on the next launch, without redeclaring them.
 */
export const CATEGORIES_KEY = 'referenceData.categories';
export const CONTEXTS_KEY = 'referenceData.contexts';

/**
 * Mirrors `settingsStore.ts`'s `safeGetString` guard: this hydration read
 * runs at module-evaluation time (inside `create(...)` below), not inside a
 * component, so an uncaught throw here (e.g. a corrupted MMKV store) would
 * crash the whole app at import time rather than just degrade to empty
 * state. Guarded so a broken cache behaves like a first launch instead.
 */
function safeGetObject<T>(key: string): T | undefined {
  try {
    return getObject<T>(key);
  } catch {
    return undefined;
  }
}

const cachedCategories = safeGetObject<Category[]>(CATEGORIES_KEY);
const cachedContexts = safeGetObject<string[]>(CONTEXTS_KEY);

export const useReferenceDataStore = create<ReferenceDataState>(() => ({
  categories: cachedCategories ?? [],
  contexts: cachedContexts ?? [],
}));

/**
 * The sole writer of this slice (AD-16), restricted to
 * `src/features/settings/**` by the `no-restricted-imports` `importNames`
 * override in `.eslintrc.js`. Callers (today, only
 * `features/settings/referenceDataFetch.ts`) own writing the same data to
 * the MMKV cache (`CATEGORIES_KEY`/`CONTEXTS_KEY` above) themselves — this
 * function only updates in-memory state.
 */
export function setReferenceData(data: Partial<ReferenceDataState>): void {
  useReferenceDataStore.setState((state) => ({ ...state, ...data }));
}
