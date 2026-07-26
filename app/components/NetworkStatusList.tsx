// ICPS/components/NetworkStatusList.tsx

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../utils/colors';
import { spacing } from '../utils/spacing';
import { NetworkReading } from '../types';

interface NetworkStatusListProps {
  networks: NetworkReading[];
}

export default function NetworkStatusList({ networks }: NetworkStatusListProps) {
  const topFive = [...networks].sort((a, b) => b.rssi - a.rssi).slice(0, 5);

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

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.borderRadiusStandard,
    padding: spacing.cardPadding,
    backgroundColor: colors.card,
  },
  row: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
});