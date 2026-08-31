/**
 * React Native CLI config.
 *
 * `assets` registers `src/assets/fonts/` for native font linking (`npx react-native-asset`
 * or manual linking — see the native project steps documented in
 * `_bmad-output/implementation-artifacts/deferred-work.md`). This makes the Special
 * Elite / Courier Prime .ttf files available as native fonts on Android and iOS so
 * `src/theme/typography.ts`'s `fontFamily` values actually resolve at runtime.
 */
module.exports = {
  assets: ['./src/assets/fonts'],
};
