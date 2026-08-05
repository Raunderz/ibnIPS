// app/components/NetworkList.tsx

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
} from 'react-native';
import { Network } from '../services/wifiService';
import { NetworkItem } from './NetworkItem';
import { colors } from '../utils/colors';
import { spacing } from '../utils/spacing';

interface NetworkListProps {
  networks: Network[];
  onSelectNetwork?: (network: Network) => void;
  getSignalBars: (rssi: number) => number;
  getSignalQuality: (rssi: number) => number;
  isLoading?: boolean;
  maxNetworks?: number;
}

export const NetworkList: React.FC<NetworkListProps> = ({
  networks,
  onSelectNetwork,
  getSignalBars,
  getSignalQuality,
  isLoading = false,
  maxNetworks = 50,
}) => {
  const [searchText, setSearchText] = useState('');

  const filteredNetworks = networks
    .filter(net => {
      if (!searchText) return true;
      const ssid = net.ssid?.toLowerCase() || '';
      const bssid = net.bssid.toLowerCase();
      const query = searchText.toLowerCase();
      return ssid.includes(query) || bssid.includes(query);
    })
    .slice(0, maxNetworks);

  const renderEmptyState = () => {
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
          <Text style={styles.emptySubtext}>
            Make sure Wi-Fi is enabled and try again
          </Text>
        </View>
      );
    }

    if (filteredNetworks.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No matches found</Text>
          <Text style={styles.emptySubtext}>Try a different search term</Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search networks..."
        placeholderTextColor="#999"
        value={searchText}
        onChangeText={setSearchText}
      />

      {networks.length > 0 && (
        <Text style={styles.countText}>
          Showing {filteredNetworks.length} of {networks.length} networks
        </Text>
      )}

      <FlatList
        data={filteredNetworks}
        keyExtractor={(item, index) => `${item.bssid}-${index}`}
        renderItem={({ item }) => (
          <NetworkItem
            network={item}
            signalBars={getSignalBars(item.rssi)}
            signalQuality={getSignalQuality(item.rssi)}
            onPress={() => onSelectNetwork?.(item)}
          />
        )}
        ListEmptyComponent={renderEmptyState}
        scrollEnabled={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  searchInput: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    fontSize: 14,
    color: colors.text,
  },
  countText: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#999',
  },
});