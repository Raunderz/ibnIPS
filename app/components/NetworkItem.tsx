// ICPS/components/NetworkItem.tsx
// A single network row in the Wi-Fi debug list.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Network } from '../services/wifiService';
import SignalBar from './SignalBar';
import { useThemeColors, ThemeColors } from '../utils/colors';
import { spacing } from '../utils/spacing';
import { getFrequencyBand } from '../utils/wifi';

interface NetworkItemProps {
  network: Network;
  showBssid?: boolean;
}

export default function NetworkItem({ network, showBssid = true }: NetworkItemProps) {
  const themeColors = useThemeColors();
  const styles = getStyles(themeColors);

  const displayName = network.ssid && network.ssid.length > 0 ? network.ssid : 'Hidden Network';

  return (
    <View style={styles.container}>
      <SignalBar rssi={network.rssi} />
      <View style={styles.infoSection}>
        <Text style={styles.ssidText} numberOfLines={1}>
          {displayName}
        </Text>
        <View style={styles.detailsRow}>
          {showBssid && <Text style={styles.bssidText}>{network.bssid}</Text>}
          <Text style={styles.bandText}>{getFrequencyBand(network.frequency)}</Text>
        </View>
      </View>
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.componentSpacingVertical,
      paddingHorizontal: spacing.screenPaddingHorizontal,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceContainerHigh,
    },
    infoSection: {
      flex: 1,
      marginLeft: spacing.cardPadding,
    },
    ssidText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.onSurface,
      marginBottom: 4,
    },
    detailsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    bssidText: {
      fontSize: 12,
      color: colors.onSurfaceVariant,
      marginRight: 8,
    },
    bandText: {
      fontSize: 12,
      color: colors.onSurfaceVariant,
    },
  });
