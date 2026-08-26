import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function AnalyticsScreen(): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <Text>Analytics</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
