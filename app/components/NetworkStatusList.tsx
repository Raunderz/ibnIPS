// ICPS/components/NetworkStatusList.tsx

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemeColors, ThemeColors } from '../utils/colors';
import { spacing } from '../utils/spacing';
import { NetworkReading } from '../types';

interface NetworkStatusListProps {
  networks: NetworkReading[];
}

export default function NetworkStatusList({ networks }: NetworkStatusListProps) {
  const topFive = [...networks].sort((a, b) => b.rssi - a.rssi).slice(0, 5);
  const themeColors = useThemeColors();
  const styles = getStyles(themeColors);

  return (
    <View>
      <Text style={styles.label}>Visible Networks: {topFive.length}</Text>
      <View style={styles.card}>
        {topFive.map((network) => (
          <Text key={network.id} style={styles.row}>
            • {network.name} ({network.rssi} dBm)
          </Text>
        ))}
      </View>
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.primary,
    marginBottom: 6,
    paddingLeft: 4,
  },
  card: {
    borderRadius: spacing.shapeMedium, // MD3 Medium Shape (12dp)
    padding: spacing.cardPadding,
    backgroundColor: colors.surfaceContainerLow, // MD3 Container Low
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1, // MD3 Tonal Card elevation
  },
  row: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginBottom: 6,
    letterSpacing: 0.25,
  },
});