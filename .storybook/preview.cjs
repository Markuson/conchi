/** @type {import('@storybook/react').Preview} */
const React = require('react');
const { View } = require('react-native');
const { ThemeProvider, useTheme } = require('../src/theme');

// Renders the story on a canvas actually painted with the current theme's `bg`
// token (plus breathing-room padding) — without this, the dark/light toolbar
// toggle re-themes the component but the surrounding canvas stays the browser's
// default white in both modes, so "dark mode" never visually reads as dark.
function ThemedCanvas(props) {
  const theme = useTheme();
  return React.createElement(
    View,
    { style: { flexGrow: 1, minHeight: '100%', backgroundColor: theme.colors.bg, padding: theme.spacing.lg } },
    props.children,
  );
}

module.exports = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  // Dark/light toolbar toggle (AC: "Button story visible ... in both dark and light
  // mode"). Defaults to dark, matching DESIGN.md / ThemeProvider's own default.
  globalTypes: {
    theme: {
      description: 'Theme mode',
      defaultValue: 'dark',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          { value: 'dark', title: 'Dark' },
          { value: 'light', title: 'Light' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const mode = context.globals.theme === 'light' ? 'light' : 'dark';
      return React.createElement(
        ThemeProvider,
        { mode: mode },
        React.createElement(ThemedCanvas, null, React.createElement(Story)),
      );
    },
  ],
};
