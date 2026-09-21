import React, { useEffect } from 'react';
import { DefaultTheme, NavigationContainer, type Theme as NavigationTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator } from './navigation';
import { ThemeProvider, useTheme, type ThemeMode } from './theme/ThemeProvider';
import { ConchiBubble } from './components/ConchiBubble';
import type { Theme } from './features/settings/settingsStore';
import { fetchReferenceData } from './features/settings/referenceDataFetch';
import { getFcmToken, onForegroundMessage, registerFcmToken } from './lib/fcm';
import { AUTH_SECRET_KEY, readSecureItem } from './lib/storage/secureStore';
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

  // Story 2.1 (FCM spike): startup token registration + foreground listener.
  // Mirrors `useTracerBullet.checkConfigured`'s "sync webhookUrl + async
  // secret presence" guard rather than reusing the hook itself — that hook
  // owns tracer-bullet UI state (`status`/`responseText`) this effect has no
  // use for. No feature-level dispatch yet (Story 2.4+); the foreground
  // listener only console-logs the typed payload for manual AC2 inspection.
  useEffect(() => {
    let cancelled = false;

    // Story 2.2: reference-data (categories/subcategories/contexts) fetch.
    // Independent of the FCM registration flow below — hydration from the
    // MMKV cache already happened synchronously at `referenceData.ts`
    // module load, so this call is a background refresh, never a render
    // blocker. `fetchReferenceData` never throws and sets no component
    // state itself, so there's nothing for a `cancelled` guard to protect
    // here.
    void fetchReferenceData();

    void (async () => {
      const { webhookUrl } = useSettingsStore.getState();
      if (!webhookUrl) {
        console.log('[fcm] skipped: no webhookUrl configured');
        return;
      }

      let secret: string | null;
      try {
        secret = await readSecureItem(AUTH_SECRET_KEY);
      } catch (error) {
        console.log('[fcm] skipped: secure store read failed', error);
        return;
      }
      // Checked immediately after the secret read resolves (not just after
      // `getFcmToken()` below) — `getFcmToken()` can trigger a native
      // permission prompt, which shouldn't fire once the effect that kicked
      // this off has already been torn down (e.g. a fast unmount in tests).
      if (!secret) {
        console.log('[fcm] skipped: no auth secret configured');
        return;
      }
      if (cancelled) {
        return;
      }

      const token = await getFcmToken();
      if (!token) {
        console.log('[fcm] skipped: no token from getFcmToken (see its own log line above for why)');
        return;
      }
      if (cancelled) {
        return;
      }

      try {
        const response = await registerFcmToken(token, webhookUrl, secret);
        if (!response.ok) {
          console.log(`[fcm] token registration failed: HTTP ${response.status}`);
        } else {
          console.log('[fcm] token registration succeeded');
        }
      } catch (error) {
        console.log('[fcm] token registration failed', error);
      }
    })();

    const subscription = onForegroundMessage((payload) => {
      console.log('[fcm] foreground message received', payload.type, payload);
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

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
