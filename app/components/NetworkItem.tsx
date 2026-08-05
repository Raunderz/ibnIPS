// app/components/NetworkItem.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Network } from '../services/wifiService';
import { SignalBar } from './SignalBar';
import { colors } from '../utils/colors';
import { spacing } from '../utils/spacing';

interface NetworkItemProps {
  network: Network;
  signalBars: number;
  signalQuality: number;
  onPress?: () => void;
}

export const NetworkItem: React.FC<NetworkItemProps> = ({
  network,
  signalBars,
  signalQuality,
  onPress,
}) => {
  const displayName = network.ssid || `Hidden Network (${network.bssid})`;
  const frequencyBand = network.frequency >= 5000 ? '5 GHz' : '2.4 GHz';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.leftSection}>
        <SignalBar bars={signalBars} size="medium" />
        
        <View style={styles.infoSection}>
          <Text style={styles.ssidText} numberOfLines={1}>
            {displayName}
          </Text>
          <View style={styles.detailsRow}>
            <Text style={styles.detailText}>
              {network.rssi} dBm
            </Text>
            <Text style={styles.separator}>•</Text>
            <Text style={styles.detailText}>
              {frequencyBand}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.rightSection}>
        <Text style={[styles.qualityText, { color: getQualityColor(signalQuality) }]}>
          {signalQuality}%
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const getQualityColor = (quality: number): string => {
  if (quality >= 70) return colors.success;
  if (quality >= 40) return colors.warning;
  return colors.danger;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoSection: {
    flex: 1,
    marginLeft: spacing.md,
  },
  ssidText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    color: '#999',
  },
  separator: {
    marginHorizontal: 4,
    color: '#CCC',
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  qualityText: {
    fontSize: 14,
    fontWeight: '700',
  },
});