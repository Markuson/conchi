// @ts-check
const { themes: prismThemes } = require('prism-react-renderer');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Conchi',
  tagline: 'Mobile interface to Conchita, a self-hosted AI accounting agent',
  favicon: 'img/favicon.ico',

  url: 'https://markuson.github.io',
  baseUrl: '/conchi/',

  organizationName: 'Markuson',
  projectName: 'conchi',

  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          routeBasePath: '/',
        },
        blog: false,
        theme: {
          customCss: undefined,
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'Conchi',
        items: [
          {
            href: 'https://markuson.github.io/conchi/storybook/',
            label: 'Storybook',
            position: 'right',
          },
          {
            href: 'https://github.com/Markuson/conchi',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

module.exports = config;
