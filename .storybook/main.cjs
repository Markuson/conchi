/**
 * Storybook configuration.
 *
 * CommonJS on purpose (`.cjs` + `module.exports`, not `export default`) so it loads
 * the same way regardless of whether the rest of the toolchain resolves modules as
 * ESM or CJS.
 *
 * This config currently drives only the web build published to GitHub Pages under
 * `/storybook/` (`@storybook/addon-react-native-web` renders stories with
 * react-native-web, via the `@storybook/react-webpack5` framework).
 *
 * The on-device Storybook UI (`@storybook/react-native`) is NOT wired up yet — it
 * needs its own entry point (`getStorybookUI()` + generated `storybook.requires`)
 * that this config doesn't provide. `@storybook/addon-ondevice-controls` /
 * `@storybook/addon-ondevice-actions` are installed for that future on-device UI but
 * intentionally not registered here: their manager entry imports `react-native`
 * directly, which the web build's esbuild manager bundler cannot parse (RN ships
 * Flow syntax). Story 1.3 (first real component stories) should add the on-device
 * entry point and split this into on-device vs. web addon lists — e.g. gated on
 * `process.env.STORYBOOK_WEB` — once there's something to control.
 */
module.exports = {
  stories: ['../src/**/*.stories.?(ts|tsx|js|jsx)'],
  addons: ['@storybook/addon-react-native-web'],
  framework: {
    name: '@storybook/react-webpack5',
    options: {},
  },
};
