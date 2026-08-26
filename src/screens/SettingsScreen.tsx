import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSettingsStore } from '../store';

export function SettingsScreen(): React.JSX.Element {
  const theme = useSettingsStore((state) => state.theme);

  return (
    <SafeAreaView style={styles.container}>
      <Text>Settings</Text>
      <Text>Theme: {theme}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
