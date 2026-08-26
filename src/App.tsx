import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator } from './navigation';

export function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
