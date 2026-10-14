module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // `react-native-worklets/plugin` must be listed last (the worklets
  // compiler's own requirement — it rewrites worklets after every other
  // transform has run). Reanimated v4 delegates worklet compilation to
  // `react-native-worklets`, so this is the plugin Reanimated itself now
  // documents, not the old `react-native-reanimated/plugin`. First use in
  // this codebase, added for Story 2.3's Confirmation Card slide-up spring
  // animation.
  plugins: ['react-native-worklets/plugin'],
};
