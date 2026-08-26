/**
 * ESLint configuration.
 *
 * Ruleset: @typescript-eslint/recommended-type-checked + eslint-plugin-react-native +
 * eslint-plugin-react-hooks.
 *
 * Boundary rule (AD-2): `src/components/**` must never import from `src/features/**` or
 * `src/store/**`. The `no-restricted-imports` rule below is defined globally so it applies
 * to every file by default, then the `overrides` block turns it back off for
 * `src/screens/**`, `src/lib/**`, `src/features/**` and `src/store/**` — the directories that
 * legitimately need to import features/store. What remains restricted is `src/components/**`
 * (and anything else that was never given an explicit exemption).
 */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', 'react-native', 'react-hooks'],
  extends: [
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:react-native/all',
    'plugin:react-hooks/recommended',
  ],
  env: {
    'react-native/react-native': true,
    node: true,
    jest: true,
  },
  ignorePatterns: [
    'node_modules/',
    'android/',
    'ios/',
    'docs/',
    '.storybook/',
    'storybook-static/',
    'metro.config.js',
    'babel.config.js',
    'jest.config.js',
    '.eslintrc.js',
    '.prettierrc.js',
  ],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['**/features', '**/features/*', '**/features/**'],
            message: 'src/components/** must not import from src/features/** (AD-2). Add a hook in the feature folder instead.',
          },
          {
            group: ['**/store', '**/store/*', '**/store/**'],
            message: 'src/components/** must not import from src/store/** (AD-2). Add a hook in the feature folder instead.',
          },
        ],
      },
    ],
    'react-native/no-raw-text': 'off',
    'react-native/no-color-literals': 'off',
    '@typescript-eslint/no-explicit-any': 'error',
  },
  overrides: [
    {
      files: [
        'src/screens/**/*.{ts,tsx}',
        'src/lib/**/*.{ts,tsx}',
        'src/features/**/*.{ts,tsx}',
        'src/store/**/*.{ts,tsx}',
      ],
      rules: {
        'no-restricted-imports': 'off',
      },
    },
    {
      files: ['**/*.test.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}', 'e2e/**/*.{ts,tsx}'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
};
