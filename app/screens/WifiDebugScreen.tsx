// ICPS/screens/WifiDebugScreen.tsx
// Debug screen that displays live Wi-Fi scan results (BSSID + RSSI) sorted by
// signal strength. Display-only: no backend calls, no persistence.

import React, { useCallback } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useWifiScanning } from '../hooks/useWifiScanning';
import NetworkList from '../components/NetworkList';
import Button from '../components/Button';
import { useThemeColors, ThemeColors } from '../utils/colors';
import { spacing } from '../utils/spacing';
import { MAX_NETWORKS_DISPLAY } from '../utils/constants';

export default function WifiDebugScreen() {
  const themeColors = useThemeColors();
  const styles = getStyles(themeColors);
  const {
    scans,
    isScanning,
    lastUpdate,
    scanCount,
    error,
    startScanning,
    stopScanning,
  } = useWifiScanning({ enabled: true, pauseInBackground: true });

  const handleToggleScanning = useCallback(() => {
    if (isScanning) {
      stopScanning();
    } else {
      startScanning();
    }
  }, [isScanning, startScanning, stopScanning]);

  const handleRefresh = useCallback(() => {
    stopScanning();
    startScanning();
  }, [stopScanning, startScanning]);

  const formatTime = (date: Date | null): string => {
    if (!date) return 'Never';
    const diff = Math.max(0, Date.now() - date.getTime());
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status card */}
        <View style={styles.card}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Status</Text>
            <View style={styles.statusValueContainer}>
              {isScanning && <ActivityIndicator size="small" color={themeColors.primary} />}
              <Text style={[styles.statusValue, { color: isScanning ? themeColors.teal : themeColors.onSurfaceVariant }]}>
                {isScanning ? 'Scanning...' : 'Stopped'}
              </Text>
            </View>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Networks Found</Text>
            <Text style={styles.statusValue}>{scans.length}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Total Scans</Text>
            <Text style={styles.statusValue}>{scanCount}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Last Update</Text>
            <Text style={styles.statusValue}>{formatTime(lastUpdate)}</Text>
          </View>
        </View>

        {/* Error display */}
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Error</Text>
            <Text style={styles.errorMessage}>{error}</Text>
          </View>
        )}

        {/* Controls */}
        <View style={styles.actionsRow}>
          <View style={{ flex: 1 }}>
            <Button
              label={isScanning ? 'Stop Scanning' : 'Start Scanning'}
              onPress={handleToggleScanning}
              variant={isScanning ? 'danger' : 'primary'}
            />
          </View>
          <View style={{ width: spacing.componentSpacingVertical }} />
          <View style={{ flex: 1 }}>
            <Button label="Refresh" onPress={handleRefresh} variant="secondary" />
          </View>
        </View>

        {/* Network list */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>Available Networks</Text>
          <NetworkList
            networks={scans}
            isLoading={isScanning && scans.length === 0}
            maxNetworks={MAX_NETWORKS_DISPLAY}
          />
        </View>

        {/* Signal reference */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Signal Strength Reference</Text>
          <View style={styles.infoRow}>
            <View style={[styles.colorDot, { backgroundColor: '#2E7D32' }]} />
            <Text style={styles.infoText}>Excellent (-50 dBm or higher)</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={[styles.colorDot, { backgroundColor: themeColors.warning }]} />
            <Text style={styles.infoText}>Fair (-70 to -50 dBm)</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={[styles.colorDot, { backgroundColor: themeColors.error }]} />
            <Text style={styles.infoText}>Weak (-100 to -70 dBm)</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={[styles.colorDot, { backgroundColor: themeColors.onSurfaceVariant }]} />
            <Text style={styles.infoText}>Unusable (below -100 dBm)</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.screenPaddingHorizontal,
      paddingVertical: 16,
    },
    card: {
      backgroundColor: colors.surfaceContainerLow,
      borderRadius: spacing.shapeMedium,
      padding: spacing.cardPadding,
      marginBottom: spacing.componentSpacingVertical,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 1,
    },
    statusRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.componentSpacingVertical,
    },
    statusLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.onSurfaceVariant,
    },
    statusValueContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.componentSpacingVertical,
    },
    statusValue: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.onSurface,
    },
    errorCard: {
      backgroundColor: colors.errorContainer,
      borderRadius: spacing.shapeMedium,
      padding: spacing.cardPadding,
      marginBottom: spacing.componentSpacingVertical,
      borderLeftWidth: 4,
      borderLeftColor: colors.error,
    },
    errorTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.onErrorContainer,
      marginBottom: spacing.componentSpacingVertical,
    },
    errorMessage: {
      fontSize: 13,
      color: colors.onErrorContainer,
      lineHeight: 18,
    },
    actionsRow: {
      flexDirection: 'row',
      marginBottom: spacing.componentSpacingVertical,
    },
    listSection: {
      marginBottom: spacing.componentSpacingVertical,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.onSurface,
      marginBottom: spacing.componentSpacingVertical,
    },
    infoCard: {
      backgroundColor: colors.primaryContainer,
      borderRadius: spacing.shapeMedium,
      padding: spacing.cardPadding,
      marginBottom: spacing.componentSpacingVertical,
    },
    infoTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.onPrimaryContainer,
      marginBottom: spacing.componentSpacingVertical,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.componentSpacingVertical,
    },
    colorDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: spacing.componentSpacingVertical,
    },
    infoText: {
      fontSize: 12,
      color: colors.onPrimaryContainer,
    },
  });
