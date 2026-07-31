// ICPS/components/LoadingSpinner.tsx

import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '../utils/colors';

interface LoadingSpinnerProps {
  label?: string; // e.g. "Acquiring position..." or "Loading location..."
}

export default function LoadingSpinner({ label }: LoadingSpinnerProps) {
  return (
    <View style={styles.container} accessibilityLabel={label ?? 'Loading'}>
      <ActivityIndicator size="large" color={colors.primary} />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  label: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
});