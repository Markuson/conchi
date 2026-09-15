/**
 * Manual mock for `expo-notifications`, mirroring `__mocks__/expo-secure-store.js`.
 * Jest auto-applies mocks under `<rootDir>/__mocks__/<node_modules package>.js` to
 * every test, without any test needing its own `jest.mock('expo-notifications')` call.
 *
 * The real module's native modules aren't registered under Jest's Node
 * environment, so anything that transitively imports `expo-notifications`
 * (`src/lib/fcm/fcmClient.ts`, and therefore `src/App.tsx`) would otherwise
 * crash every test file that loads it — including ones that never call it
 * directly (`App.test.tsx` mounts the real `App`, which now wires `lib/fcm/`
 * on mount).
 *
 * Defaults are the "everything works" happy path (`'granted'` permission, a
 * fixed device token); individual tests override the relevant `jest.fn()`
 * per case (e.g. permission denied) via `mockResolvedValueOnce`/`mockReturnValueOnce`.
 */
module.exports = {
  // Mirrors `expo-modules-core`'s real `PermissionStatus` enum values
  // (`fcmClient.ts` compares against this rather than raw string literals,
  // since `no-unsafe-enum-comparison` flags a literal-vs-enum comparison).
  PermissionStatus: { GRANTED: 'granted', UNDETERMINED: 'undetermined', DENIED: 'denied' },
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getDevicePushTokenAsync: jest.fn(async () => ({ type: 'android', data: 'mock-device-token' })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  removeNotificationSubscription: jest.fn(),
};
