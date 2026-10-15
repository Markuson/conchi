import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation, type NavigationProp } from '@react-navigation/native';

import { ROUTES, type StackParamList, type TabParamList } from './routes';
import { HomeScreen } from '../screens/HomeScreen';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { BottomNavBar } from './BottomNavBar';
import { EscriureOverlay } from '../components/EscriureOverlay';
import { ConfirmationCard, type ConfirmationCardData } from '../components/ConfirmationCard';
import type { UseEntrySubmissionResult } from '../features/entry/useEntrySubmission';
import { useReferenceDataStore } from '../store';
import { useTheme } from '../theme/ThemeProvider';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<StackParamList>();

type MainTabsProps = {
  entrySubmission: UseEntrySubmissionResult;
};

/**
 * Owns Story 2.4's real text-entry round trip so the FAB is global (Home and
 * Analytics share the same `BottomNavBar` instance/tab bar, hence the same
 * overlay) rather than screen-scoped. `useNavigation<NavigationProp<StackParamList>>()`
 * follows `ConchiBubble.tsx`'s pattern for driving the Settings redirect from
 * the not-configured Alert.
 *
 * `entrySubmission` is owned by `App.tsx` (one instance for the whole app,
 * not just this screen) and passed down so its `status` can also drive
 * `ConchiBubble`'s `state` prop — a sibling of this entire navigation tree —
 * without duplicating the round-trip state in two places.
 */
function MainTabs({ entrySubmission }: MainTabsProps): React.JSX.Element {
  const { colors, typography, spacing } = useTheme();
  const navigation = useNavigation<NavigationProp<StackParamList>>();
  const { categories, contexts } = useReferenceDataStore();
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [text, setText] = useState('');

  const { status, entryResult } = entrySubmission;
  // A second submission is blocked while Phase 1 ('submitting') or Phase 2
  // ('waiting') is in flight, and while a result is pending review
  // ('ready') — this story's frozen boundary.
  const isBusy = status === 'submitting' || status === 'waiting' || status === 'ready';
  // `handleFabPress` re-checks this after its `await checkConfigured()` call,
  // rather than the closed-over `isBusy` const above, which would otherwise
  // still read the value from the render that started the press even if
  // `status` flips (e.g. a round-trip result arrives) during that await.
  const isBusyRef = useRef(isBusy);
  useEffect(() => {
    isBusyRef.current = isBusy;
  }, [isBusy]);

  // Phase 1 succeeding closes the overlay (Phase 2 continues in the
  // background, tracked by the Bubble instead) so the user is free to
  // navigate elsewhere while Conchita processes the entry.
  useEffect(() => {
    if (status === 'waiting') {
      setOverlayVisible(false);
    }
  }, [status]);

  const handleFabPress = (): void => {
    void (async () => {
      const configured = await entrySubmission.checkConfigured();
      if (!configured) {
        Alert.alert(
          'Connexió no configurada',
          "Configura la URL del webhook i el secret d'autenticació a Configuració.",
          [{ text: "D'acord", onPress: () => navigation.navigate(ROUTES.Settings) }],
        );
        return;
      }

      if (isBusyRef.current) {
        return;
      }

      entrySubmission.reset();
      setText('');
      setOverlayVisible(true);
    })();
  };

  const handleSubmit = (): void => {
    void entrySubmission.submit(text);
  };

  const handleRetry = (): void => {
    void entrySubmission.retry();
  };

  const handleClose = (): void => {
    setOverlayVisible(false);
    entrySubmission.reset();
    setText('');
  };

  const handleAccept = (data: ConfirmationCardData): void => {
    void (async () => {
      const saved = await entrySubmission.saveEntry(data);
      if (saved) {
        entrySubmission.reset();
      }
    })();
  };

  const handleDiscard = (): void => {
    entrySubmission.reset();
  };

  const handleEdit = (): void => {
    // "Editar" only fires onEdit this story — wiring it to the Full Edit
    // Screen is Story 3.1's job (this spec's frozen "Never" boundary).
  };

  const dynamicStyles = StyleSheet.create({
    saveErrorBanner: {
      backgroundColor: colors.dangerBg,
      padding: spacing.md,
    },
    saveErrorText: {
      color: colors.danger,
    },
  });

  return (
    <>
      <Tab.Navigator
        tabBar={(props) => <BottomNavBar {...props} onFabPress={handleFabPress} />}
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
      >
        <Tab.Screen name={ROUTES.Home} component={HomeScreen} />
        <Tab.Screen name={ROUTES.Analytics} component={AnalyticsScreen} />
      </Tab.Navigator>
      <EscriureOverlay
        errorMessage={entrySubmission.errorMessage}
        onChangeText={setText}
        onClose={handleClose}
        onRetry={handleRetry}
        onSubmit={handleSubmit}
        status={status}
        text={text}
        visible={overlayVisible}
      />
      {status === 'ready' && entryResult ? (
        <>
          <ConfirmationCard
            categories={categories}
            contexts={contexts}
            data={entryResult}
            onAccept={handleAccept}
            onDiscard={handleDiscard}
            onEdit={handleEdit}
          />
          {entrySubmission.saveStatus === 'error' ? (
            <View style={[styles.saveErrorBanner, dynamicStyles.saveErrorBanner]}>
              <Text style={[typography.fieldValue, dynamicStyles.saveErrorText]}>
                {entrySubmission.saveErrorMessage}
              </Text>
            </View>
          ) : null}
        </>
      ) : null}
    </>
  );
}

type RootNavigatorProps = {
  entrySubmission: UseEntrySubmissionResult;
};

export function RootNavigator({ entrySubmission }: RootNavigatorProps): React.JSX.Element {
  const { colors } = useTheme();

  return (
    <Stack.Navigator screenOptions={{ contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name={ROUTES.AppTabs} options={{ headerShown: false }}>
        {() => <MainTabs entrySubmission={entrySubmission} />}
      </Stack.Screen>
      <Stack.Screen name={ROUTES.Settings} component={SettingsScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  saveErrorBanner: {
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});
