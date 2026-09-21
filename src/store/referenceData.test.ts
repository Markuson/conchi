/**
 * Covers the I/O & Edge-Case Matrix's hydration expectations: the store
 * hydrates `categories`/`contexts` from the MMKV JSON cache synchronously at
 * module load, before any fetch resolves. Mirrors
 * `settingsStore.test.ts`'s hoisted-mock + `jest.resetModules()` pattern,
 * since this store also reads MMKV at top-level `create(...)` evaluation
 * time.
 *
 * `setReferenceData` is deliberately NOT exercised here — AD-16 restricts
 * importing it to `src/features/settings/**`, and this file lives in
 * `src/store/**`, so an import here would itself violate the rule this story
 * adds. Its effect on the store is covered instead by
 * `features/settings/referenceDataFetch.test.ts`, which is allowed to import
 * it.
 */
const mockGetObject = jest.fn<unknown, [string]>();

jest.mock('../lib/storage/mmkv', () => ({
  getObject: mockGetObject,
}));

import type * as ReferenceDataModule from './referenceData';

function freshStore(): typeof ReferenceDataModule.useReferenceDataStore {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports -- see module doc comment above
  const mod = require('./referenceData') as typeof ReferenceDataModule;
  return mod.useReferenceDataStore;
}

beforeEach(() => {
  mockGetObject.mockReset();
});

test('hydrates categories and contexts from the MMKV cache at module load', () => {
  mockGetObject.mockImplementation((key: string) => {
    if (key === 'referenceData.categories') {
      return [{ name: 'Menjar', subcategories: ['Restaurant', 'Supermercat'] }];
    }
    if (key === 'referenceData.contexts') {
      return ['Personal', 'Feina'];
    }
    return undefined;
  });

  const useReferenceDataStore = freshStore();

  expect(useReferenceDataStore.getState().categories).toEqual([
    { name: 'Menjar', subcategories: ['Restaurant', 'Supermercat'] },
  ]);
  expect(useReferenceDataStore.getState().contexts).toEqual(['Personal', 'Feina']);
});

test('defaults to empty arrays when nothing is cached', () => {
  mockGetObject.mockReturnValue(undefined);

  const useReferenceDataStore = freshStore();

  expect(useReferenceDataStore.getState().categories).toEqual([]);
  expect(useReferenceDataStore.getState().contexts).toEqual([]);
});

test('defaults to empty arrays when the cache read throws (e.g. a corrupted store)', () => {
  mockGetObject.mockImplementation(() => {
    throw new Error('MMKV read failed');
  });

  const useReferenceDataStore = freshStore();

  expect(useReferenceDataStore.getState().categories).toEqual([]);
  expect(useReferenceDataStore.getState().contexts).toEqual([]);
});

test('the hook state has no setter — setReferenceData is not part of its returned state', () => {
  mockGetObject.mockReturnValue(undefined);

  const useReferenceDataStore = freshStore();

  expect(useReferenceDataStore.getState()).toEqual({ categories: [], contexts: [] });
});
