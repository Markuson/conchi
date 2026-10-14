/**
 * Manual mock for `react-native-reanimated`, mirroring `__mocks__/expo-secure-store.js`'s
 * convention (Jest auto-applies `<rootDir>/__mocks__/<package>.js` to every test).
 *
 * The real module registers native Turbo/Fabric bindings at import time, which don't
 * exist under Jest's Node environment — so anything that transitively imports it
 * (`ConfirmationCard.tsx`, first use in Story 2.3) would otherwise crash every test
 * file that loads it. Reanimated ships its own Jest-safe mock (`react-native-reanimated/mock`,
 * a JS-only stand-in for `useSharedValue`/`useAnimatedStyle`/`withSpring`/etc. that runs
 * synchronously with no native calls) — this file just re-exports it under the real
 * package name so `jest.mock` isn't needed at each call site.
 */
module.exports = require('react-native-reanimated/mock');
