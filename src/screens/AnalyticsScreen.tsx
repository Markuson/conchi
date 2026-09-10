import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeProvider';

export function AnalyticsScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const dynamicStyles = StyleSheet.create({ container: { backgroundColor: colors.bg } });

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <Text>Analytics</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
