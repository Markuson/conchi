import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator } from './navigation';
import { ThemeProvider } from './theme/ThemeProvider';
import { ConchiBubble } from './components/ConchiBubble';

export function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <RootNavigator />
          <ConchiBubble />
        </NavigationContainer>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
