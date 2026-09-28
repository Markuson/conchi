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
 * Categories and contexts are always fetched and written together
 * (`referenceDataFetch.ts`), so they're cached under one MMKV entry rather
 * than two — one native read/write instead of two, and no window where a
 * partial write could pair fresh categories with stale contexts (or vice
 * versa).
 */
export const REFERENCE_DATA_KEY = 'referenceData.v1';

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

const cached = safeGetObject<ReferenceDataState>(REFERENCE_DATA_KEY);

const referenceDataStore = create<ReferenceDataState>(() => ({
  categories: cached?.categories ?? [],
  contexts: cached?.contexts ?? [],
}));

/**
 * `no-restricted-imports`'s `importNames` option (AD-16) can only block
 * importing `setReferenceData` by name — it can't stop a file that already
 * imports `useReferenceDataStore` for reads from calling `.setState(...)` on
 * it directly, since that's a method call on an otherwise-permitted import,
 * not a named import the rule can see. So the publicly exported hook below
 * is a thin wrapper around the real zustand store that forwards calls and
 * `getState()` but deliberately never exposes `setState` — the real store
 * (and its `setState`) stays private to this module, reachable only through
 * `setReferenceData`.
 */
function readReferenceDataStore(): ReferenceDataState;
function readReferenceDataStore<T>(selector: (state: ReferenceDataState) => T): T;
function readReferenceDataStore<T>(selector?: (state: ReferenceDataState) => T): T | ReferenceDataState {
  return selector ? referenceDataStore(selector) : referenceDataStore();
}

export const useReferenceDataStore = readReferenceDataStore as typeof readReferenceDataStore & {
  getState: () => ReferenceDataState;
};
useReferenceDataStore.getState = referenceDataStore.getState;

/**
 * The sole writer of this slice (AD-16), restricted to
 * `src/features/settings/**` by the `no-restricted-imports` `importNames`
 * override in `.eslintrc.js`, and the only place with a reference to the
 * underlying store's `setState` at all (see `useReferenceDataStore` above).
 * Callers (today, only `features/settings/referenceDataFetch.ts`) own
 * writing the same data to the MMKV cache (`REFERENCE_DATA_KEY` above)
 * themselves — this function only updates in-memory state.
 */
export function setReferenceData(data: Partial<ReferenceDataState>): void {
  referenceDataStore.setState((state) => ({ ...state, ...data }));
}
