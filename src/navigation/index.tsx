import React, { useState } from 'react';
import { Alert } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation, type NavigationProp } from '@react-navigation/native';

import { ROUTES, type StackParamList, type TabParamList } from './routes';
import { HomeScreen } from '../screens/HomeScreen';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { BottomNavBar } from './BottomNavBar';
import { TracerBulletModal } from '../components/TracerBulletModal';
import { useTracerBullet } from '../features/tracerBullet/useTracerBullet';
import { useTheme } from '../theme/ThemeProvider';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<StackParamList>();

/**
 * Owns Story 1.6's tracer-bullet state so the FAB is global (Home and
 * Analytics share the same `BottomNavBar` instance/tab bar, hence the same
 * modal) rather than screen-scoped. `useNavigation<NavigationProp<StackParamList>>()`
 * follows `ConchiBubble.tsx`'s pattern for driving the Settings redirect from
 * the not-configured Alert.
 */
function MainTabs(): React.JSX.Element {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp<StackParamList>>();
  const tracerBullet = useTracerBullet();
  const [modalVisible, setModalVisible] = useState(false);
  const [text, setText] = useState('');

  const handleFabPress = (): void => {
    void (async () => {
      const configured = await tracerBullet.checkConfigured();
      if (!configured) {
        Alert.alert(
          'Connexió no configurada',
          "Configura la URL del webhook i el secret d'autenticació a Configuració.",
          [{ text: "D'acord", onPress: () => navigation.navigate(ROUTES.Settings) }],
        );
        return;
      }

      tracerBullet.reset();
      setText('');
      setModalVisible(true);
    })();
  };

  const handleSubmit = (): void => {
    void tracerBullet.submit(text);
  };

  const handleClose = (): void => {
    setModalVisible(false);
    tracerBullet.reset();
    setText('');
  };

  return (
    <>
      <Tab.Navigator
        tabBar={(props) => <BottomNavBar {...props} onFabPress={handleFabPress} />}
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
      >
        <Tab.Screen name={ROUTES.Home} component={HomeScreen} />
        <Tab.Screen name={ROUTES.Analytics} component={AnalyticsScreen} />
      </Tab.Navigator>
      <TracerBulletModal
        errorMessage={tracerBullet.errorMessage}
        onChangeText={setText}
        onClose={handleClose}
        onSubmit={handleSubmit}
        responseText={tracerBullet.responseText}
        status={tracerBullet.status}
        text={text}
        visible={modalVisible}
      />
    </>
  );
}

export function RootNavigator(): React.JSX.Element {
  const { colors } = useTheme();

  return (
    <Stack.Navigator screenOptions={{ contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name={ROUTES.AppTabs} component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name={ROUTES.Settings} component={SettingsScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
