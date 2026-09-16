/**
 * ESLint configuration.
 *
 * Ruleset: @typescript-eslint/recommended-type-checked + eslint-plugin-react-native +
 * eslint-plugin-react-hooks.
 *
 * Boundary rule (AD-2): `src/components/**` must never import from `src/features/**` or
 * `src/store/**`. The `no-restricted-imports` rule below is defined globally so it applies
 * to every file by default, then the `overrides` block turns it back off for
 * `src/screens/**`, `src/lib/**`, `src/features/**`, `src/store/**` and `src/App.tsx`/
 * `src/App.test.tsx` — the directories (plus the app-shell entry point, which resolves
 * `ThemeProvider`'s mode from `useSettingsStore` per Story 1.5, and its own test, which seeds
 * that same store) that legitimately need to import features/store. `src/navigation/index.tsx`
 * joins the list in Story 1.6: it's the composition root assembling both the FAB's `onFabPress`
 * (via `useTracerBullet`) and stack-level `useNavigation` for the not-configured redirect, so it
 * needs the same store/feature access `App.tsx` already has. `BottomNavBar.tsx` stays pure
 * prop-driven, no exemption needed. What remains restricted is `src/components/**` (and anything
 * else that was never given an explicit exemption).
 *
 * AD-16 (Story 2.2): `setReferenceData` (`src/store/referenceData.ts`) is
 * restricted to `src/features/settings/**` — the slice's sole writer — via a
 * second `no-restricted-imports` pattern matching that one export name,
 * scoped (via a glob `group`, see `AD16_NO_SET_REFERENCE_DATA_PATTERN` below
 * for the literal pattern) to import specifiers ending in
 * `store/referenceData` specifically —
 * `src/lib/types/referenceData.ts` (an unrelated file, just the type
 * definition) happens to share the `referenceData` basename, and ESLint
 * flags every namespace import (`import * as x`, including a type-only one)
 * whose source matches `group` regardless of which names are actually used,
 * so a bare `referenceData` glob false-positives on that file's own barrel
 * re-export and on this store's own test file. Because a single
 * `no-restricted-imports` rule value can't be "half off" per override, the
 * broad AD-2 override below is split into two layers for this rule: the
 * existing directories keep the AD-16 pattern (re-declared, not turned off)
 * while `src/features/settings/**` gets its own later override that turns
 * the whole rule off, since it both needs the AD-2 exemption (already
 * implied) and is the one place allowed to import `setReferenceData`.
 */

// Shared by the base `rules` block and the re-declaring override below
// (`src/screens/**`/`src/lib/**`/etc.) so the pattern is defined once, not
// hand-copied in two places that would otherwise need to be kept in sync.
const AD16_NO_SET_REFERENCE_DATA_PATTERN = {
  group: ['**/store/referenceData'],
  importNames: ['setReferenceData'],
  message:
    'setReferenceData is restricted to src/features/settings/** (AD-16) — it is the sole writer of the reference-data slice. Read categories/contexts via useReferenceDataStore instead.',
};

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
    '__mocks__/',
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
          AD16_NO_SET_REFERENCE_DATA_PATTERN,
        ],
      },
    ],
    'react-native/no-raw-text': 'off',
    'react-native/no-color-literals': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
  },
  overrides: [
    {
      // AD-2 exemption: these directories may import from src/features/**
      // and src/store/** freely. The AD-16 setReferenceData restriction is
      // re-declared (not turned off) here, since every one of these
      // directories except src/features/settings/** must still be blocked
      // from importing it — see the more specific override below.
      files: [
        'src/screens/**/*.{ts,tsx}',
        'src/lib/**/*.{ts,tsx}',
        'src/features/**/*.{ts,tsx}',
        'src/store/**/*.{ts,tsx}',
        'src/App.tsx',
        'src/App.test.tsx',
        'src/navigation/index.tsx',
      ],
      rules: {
        'no-restricted-imports': ['error', { patterns: [AD16_NO_SET_REFERENCE_DATA_PATTERN] }],
      },
    },
    {
      // The one place AD-16 allows importing setReferenceData. Declared
      // after (and so takes precedence over) the broad override above,
      // which would otherwise still block it here too.
      files: ['src/features/settings/**/*.{ts,tsx}'],
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
    {
      // src/theme/colors.ts is the single source of truth for raw color values
      // (AD: "the only file allowed to contain raw hex/rgba literals").
      files: ['src/theme/**/*.{ts,tsx}'],
      rules: {
        'react-native/no-color-literals': 'off',
      },
    },
  ],
};
