/**
 * pnpm stores packages in a content-addressable `.pnpm` store, so every module
 * path contains an extra `node_modules/.pnpm/<name>@<version>/node_modules/<name>/...`
 * hop compared to a flat npm/yarn install. Jest's default
 * `transformIgnorePatterns` (from `@react-native/jest-preset`) assumes a flat
 * layout, so it never reaches the inner, real package directory and RN-ecosystem
 * packages that ship untranspiled ESM/JSX are never transformed. Allowing the
 * `.pnpm` hop through, in addition to the usual RN-ecosystem package names,
 * fixes that for both hops.
 */
const transformablePackages = [
  '(jest-)?react-native',
  '@react-native(-community)?',
  '@react-navigation',
  'react-native-.*',
  '@?expo(-.*)?',
];

module.exports = {
  preset: '@react-native/jest-preset',
  transformIgnorePatterns: [
    `node_modules/(?!\\.pnpm/|(${transformablePackages.join('|')})/)`,
  ],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/', '/android/', '/ios/', '/docs/'],
};
