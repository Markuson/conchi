import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ROUTES, type StackParamList, type TabParamList } from './routes';
import { HomeScreen } from '../screens/HomeScreen';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { BottomNavBar } from './BottomNavBar';
import { useTheme } from '../theme/ThemeProvider';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<StackParamList>();

function MainTabs(): React.JSX.Element {
  const { colors } = useTheme();

  return (
    <Tab.Navigator tabBar={(props) => <BottomNavBar {...props} />} screenOptions={{ sceneStyle: { backgroundColor: colors.bg } }}>
      <Tab.Screen name={ROUTES.Home} component={HomeScreen} />
      <Tab.Screen name={ROUTES.Analytics} component={AnalyticsScreen} />
    </Tab.Navigator>
  );
}

export function RootNavigator(): React.JSX.Element {
  const { colors } = useTheme();

  return (
    <Stack.Navigator screenOptions={{ contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name={ROUTES.AppTabs} component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name={ROUTES.Settings} component={SettingsScreen} />
    </Stack.Navigator>
  );
}
