/**
 * Manual mock for `expo-secure-store`. Jest auto-applies mocks under
 * `<rootDir>/__mocks__/<node_modules package>.js` to every test, without any
 * test needing its own `jest.mock('expo-secure-store')` call.
 *
 * The real module's `ExpoSecureStore.js` calls `requireNativeModule` from
 * `expo-modules-core` at import time, which throws outside a real
 * iOS/Android runtime (no native module registered under Jest's Node
 * environment) — so anything that transitively imports `expo-secure-store`
 * (e.g. `src/lib/storage/secureStore.ts`, and therefore `SettingsScreen`)
 * would otherwise crash every test file that loads it, including ones that
 * never call it (`ConchiBubble.test.tsx` mounts the real `RootNavigator`,
 * which statically imports `SettingsScreen`).
 *
 * Backed by a simple in-memory Map — good enough for unit tests, which don't
 * need real device-keychain persistence.
 */
const store = new Map();

module.exports = {
  getItemAsync: jest.fn(async (key) => (store.has(key) ? store.get(key) : null)),
  setItemAsync: jest.fn(async (key, value) => {
    store.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key) => {
    store.delete(key);
  }),
  isAvailableAsync: jest.fn(async () => true),
};
