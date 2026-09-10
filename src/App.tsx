import React from 'react';
import { DefaultTheme, NavigationContainer, type Theme as NavigationTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator } from './navigation';
import { ThemeProvider, useTheme, type ThemeMode } from './theme/ThemeProvider';
import { ConchiBubble } from './components/ConchiBubble';
import type { Theme } from './features/settings/settingsStore';
import { useSettingsStore } from './store';

/**
 * Resolves the persisted `Theme` setting into the `mode` prop `ThemeProvider`
 * expects. `'system'` maps to `undefined` so `ThemeProvider` falls back to its
 * own OS-scheme derivation (`useColorScheme()`); `'dark'`/`'light'` force that
 * mode instead. Pulled out of the JSX as its own named function (rather than
 * an inline ternary) so the "Theme switch" I/O-matrix row has something
 * narrow and pure to unit-test without needing a full `App` render.
 */
export function resolveThemeProviderMode(theme: Theme): ThemeMode | undefined {
  return theme === 'system' ? undefined : theme;
}

export function App(): React.JSX.Element {
  // Reading straight from the store (hydrated synchronously from MMKV at
  // module load, see `settingsStore.ts`) means the persisted theme applies
  // before the first frame renders, with no restart needed when it's changed
  // from Settings.
  const theme = useSettingsStore((state) => state.theme);

  return (
    <ThemeProvider mode={resolveThemeProviderMode(theme)}>
      <AppShell />
    </ThemeProvider>
  );
}

/**
 * Split out from `App` so it can call `useTheme()` — React Navigation has its
 * own, entirely separate theming system (`NavigationContainer`'s `theme`
 * prop) that defaults to a light theme regardless of our `ThemeProvider`.
 * Without mapping our resolved colors into it here, every screen/header/tab
 * bar renders on React Navigation's default white background no matter what
 * Tema is selected.
 */
function AppShell(): React.JSX.Element {
  const { mode, colors } = useTheme();

  const navigationTheme: NavigationTheme = {
    ...DefaultTheme,
    dark: mode === 'dark',
    colors: {
      ...DefaultTheme.colors,
      background: colors.bg,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      primary: colors.accent,
    },
  };

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navigationTheme}>
        <RootNavigator />
        <ConchiBubble />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
