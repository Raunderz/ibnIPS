// ICPS/components/NetworkList.tsx
// Container that renders the list of Wi-Fi networks with optional search.

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { Network } from '../services/wifiService';
import NetworkItem from './NetworkItem';
import { useThemeColors, ThemeColors } from '../utils/colors';
import { spacing } from '../utils/spacing';
import { MAX_NETWORKS_DISPLAY } from '../utils/constants';

interface NetworkListProps {
  networks: Network[];
  isLoading?: boolean;
  maxNetworks?: number;
}

export default function NetworkList({
  networks,
  isLoading = false,
  maxNetworks = MAX_NETWORKS_DISPLAY,
}: NetworkListProps) {
  const themeColors = useThemeColors();
  const styles = getStyles(themeColors);
  const [searchText, setSearchText] = useState('');

  const filteredNetworks = networks
    .filter((net) => {
      if (!searchText) return true;
      const query = searchText.toLowerCase();
      const ssid = net.ssid?.toLowerCase() ?? '';
      return ssid.includes(query) || net.bssid.toLowerCase().includes(query);
    })
    .slice(0, maxNetworks);

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Scanning Wi-Fi networks...</Text>
        </View>
      );
    }
    if (networks.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No networks detected</Text>
          <Text style={styles.emptySubtext}>Make sure Wi-Fi is enabled and try again</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No matches found</Text>
        <Text style={styles.emptySubtext}>Try a different search term</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {networks.length > 0 && (
        <TextInput
          style={styles.searchInput}
          placeholder="Search networks..."
          placeholderTextColor={themeColors.onSurfaceVariant}
          value={searchText}
          onChangeText={setSearchText}
        />
      )}

      {networks.length > 0 && (
        <Text style={styles.countText}>
          Showing {filteredNetworks.length} of {networks.length} networks
        </Text>
      )}

      {filteredNetworks.length === 0
        ? renderEmpty()
        : filteredNetworks.map((item, index) => (
            <NetworkItem key={`${item.bssid}-${index}`} network={item} />
          ))}
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    searchInput: {
      marginHorizontal: spacing.screenPaddingHorizontal,
      marginVertical: spacing.componentSpacingVertical,
      paddingHorizontal: spacing.cardPadding,
      paddingVertical: spacing.buttonPaddingVertical,
      backgroundColor: colors.surfaceContainerHigh,
      borderRadius: spacing.shapeMedium,
      fontSize: 14,
      color: colors.onSurface,
    },
    countText: {
      marginHorizontal: spacing.screenPaddingHorizontal,
      marginBottom: spacing.componentSpacingVertical,
      fontSize: 12,
      color: colors.onSurfaceVariant,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.onSurface,
      marginBottom: spacing.componentSpacingVertical,
    },
    emptySubtext: {
      fontSize: 13,
      color: colors.onSurfaceVariant,
      textAlign: 'center',
    },
  });
