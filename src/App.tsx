import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator } from './navigation';
import { ThemeProvider, type ThemeMode } from './theme/ThemeProvider';
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
      <SafeAreaProvider>
        <NavigationContainer>
          <RootNavigator />
          <ConchiBubble />
        </NavigationContainer>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
