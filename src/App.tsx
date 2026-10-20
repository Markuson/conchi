import React, { useEffect } from 'react';
import { DefaultTheme, NavigationContainer, type Theme as NavigationTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator } from './navigation';
import { ThemeProvider, useTheme, type ThemeMode } from './theme/ThemeProvider';
import { ConchiBubble, type ConchiBubbleState } from './components/ConchiBubble';
import type { Theme } from './features/settings/settingsStore';
import { fetchReferenceData } from './features/settings/referenceDataFetch';
import { useEntrySubmission, type EntrySubmissionStatus, type UseEntrySubmissionResult } from './features/entry/useEntrySubmission';
import { resolveConfiguredCredentials } from './lib/api/connection';
import { getFcmToken, onForegroundMessage, registerFcmToken } from './lib/fcm';
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

/**
 * Maps `useEntrySubmission`'s round-trip status onto `ConchiBubble`'s
 * three-way `state` prop (Story 2.4). `'submitting'` (Phase 1 in flight)
 * stays Idle per this story's frozen I/O matrix; only Phase 2's `'waiting'`
 * shows Working, and `'ready'` (a result just arrived) goes straight back to
 * Idle as `ConfirmationCard` takes over.
 */
export function resolveBubbleState(status: EntrySubmissionStatus): ConchiBubbleState {
  if (status === 'waiting') {
    return 'working';
  }
  if (status === 'error') {
    return 'error';
  }
  return 'idle';
}

export function App(): React.JSX.Element {
  // Reading straight from the store (hydrated synchronously from MMKV at
  // module load, see `settingsStore.ts`) means the persisted theme applies
  // before the first frame renders, with no restart needed when it's changed
  // from Settings.
  const theme = useSettingsStore((state) => state.theme);

  // Story 2.4: one `useEntrySubmission` instance for the whole app (not just
  // `MainTabs`), so its `status` can also drive `ConchiBubble` — a sibling of
  // the entire navigation tree — without duplicating round-trip state.
  const entrySubmission = useEntrySubmission();
  // Destructured so the FCM effect below can depend on this one stable
  // function directly, rather than a property access off `entrySubmission`
  // (a fresh object every render) — keeps `react-hooks/exhaustive-deps` happy
  // without re-subscribing the listener on every render.
  const { handleRoundTripResult } = entrySubmission;

  // Story 2.1 (FCM spike) + Story 2.2 (reference-data fetch): both gate on
  // the exact same "webhookUrl configured + secret present" check, resolved
  // once here (`resolveConfiguredCredentials`, shared with
  // `useTracerBullet.checkConfigured` and `referenceDataFetch.ts`) rather
  // than each flow independently reading secure storage for the same key on
  // every cold start.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const credentials = await resolveConfiguredCredentials('startup');
      if (!credentials) {
        return;
      }

      // Story 2.2: reference-data (categories/subcategories/contexts)
      // fetch. Independent of the FCM registration flow below — hydration
      // from the MMKV cache already happened synchronously at
      // `referenceData.ts` module load, so this call is a background
      // refresh, never a render blocker. `fetchReferenceData` never throws
      // and sets no component state itself, so there's nothing for a
      // `cancelled` guard to protect here.
      void fetchReferenceData(credentials);

      // Checked immediately after credentials resolve (not just after
      // `getFcmToken()` below) — `getFcmToken()` can trigger a native
      // permission prompt, which shouldn't fire once the effect that kicked
      // this off has already been torn down (e.g. a fast unmount in tests).
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
        const response = await registerFcmToken(token, credentials.webhookUrl, credentials.secret);
        if (!response.ok) {
          console.log(`[fcm] token registration failed: HTTP ${response.status}`);
        } else {
          console.log('[fcm] token registration succeeded');
        }
      } catch (error) {
        console.log('[fcm] token registration failed', error);
      }
    })();

    // Story 2.4: the first real dispatch wiring for `round_trip_result` —
    // forwarded into the active `useEntrySubmission` instance, which maps
    // `entry` to `ConfirmationCardData` and (if it's currently waiting on
    // Phase 2) mounts `ConfirmationCard`. `invoice_unknown`/`invoice_known`
    // have no consumer yet (Epic 6). `handleRoundTripResult` has a stable
    // identity (see its own doc comment), so listing it as this effect's
    // dependency never causes a re-subscribe.
    const subscription = onForegroundMessage((payload) => {
      if (payload.type === 'round_trip_result') {
        handleRoundTripResult(payload.entry);
      } else {
        console.log('[fcm] unhandled foreground message type', payload.type);
      }
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [handleRoundTripResult]);

  return (
    <ThemeProvider mode={resolveThemeProviderMode(theme)}>
      <AppShell entrySubmission={entrySubmission} />
    </ThemeProvider>
  );
}

type AppShellProps = {
  entrySubmission: UseEntrySubmissionResult;
};

/**
 * Split out from `App` so it can call `useTheme()` — React Navigation has its
 * own, entirely separate theming system (`NavigationContainer`'s `theme`
 * prop) that defaults to a light theme regardless of our `ThemeProvider`.
 * Without mapping our resolved colors into it here, every screen/header/tab
 * bar renders on React Navigation's default white background no matter what
 * Tema is selected.
 */
function AppShell({ entrySubmission }: AppShellProps): React.JSX.Element {
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
        <RootNavigator entrySubmission={entrySubmission} />
        <ConchiBubble state={resolveBubbleState(entrySubmission.status)} />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
