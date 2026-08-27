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
 *
 * `webpackFinal` forces `@storybook/react-dom-shim`'s React 18 (`createRoot`) variant.
 * `@storybook/react-dom-shim`'s own preset only does this when `react-dom`'s version
 * *starts with* `'18'` (see its `dist/preset.js`) — it has no React 19 case, so on this
 * repo's `react-dom@19.2.3` it silently falls through to the React 16 shim, which calls
 * the legacy `ReactDOM.render`/`unmountComponentAtNode` APIs. React 19 removed both, so
 * every story fails to mount with `TypeError: react_dom.unmountComponentAtNode is not a
 * function`. The React 18 shim uses `react-dom/client`'s `createRoot`, which React 19
 * still ships — safe to force regardless of the exact 18 vs. 19 label.
 *
 * TODO: remove this `webpackFinal` alias once `@storybook/react-dom-shim`'s own
 * preset gains a real React 19 case (it currently only auto-detects versions
 * starting with `'18'` — see its `dist/preset.js`) — at that point its default
 * detection will pick the right shim on its own and this override becomes dead code.
 */
module.exports = {
  stories: ['../src/**/*.stories.?(ts|tsx|js|jsx)'],
  addons: ['@storybook/addon-react-native-web'],
  framework: {
    name: '@storybook/react-webpack5',
    options: {},
  },
  webpackFinal: (config) => ({
    ...config,
    resolve: {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        '@storybook/react-dom-shim': '@storybook/react-dom-shim/dist/react-18',
      },
    },
  }),
};
