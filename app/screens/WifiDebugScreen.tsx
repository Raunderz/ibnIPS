// app/screens/WifiDebugScreen.tsx

import React, { useCallback } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useWifiScanning } from '../hooks/useWifiScanning';
import { NetworkList } from '../components/NetworkList';
import { Button } from '../components/Button';
import { colors } from '../utils/colors';
import { spacing } from '../utils/spacing';

export const WifiDebugScreen: React.FC = () => {
  const {
    scans,
    isScanning,
    lastUpdate,
    scanCount,
    error,
    startScanning,
    stopScanning,
    getSignalBars,
    getSignalQuality,
  } = useWifiScanning({ enabled: true, pauseInBackground: true });

  const handleToggleScanning = useCallback(() => {
    if (isScanning) {
      stopScanning();
    } else {
      startScanning();
    }
  }, [isScanning, startScanning, stopScanning]);

  const formatTime = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Wi-Fi Networks</Text>
          <Text style={styles.subtitle}>Live network scanning</Text>
        </View>

        {/* Status Section */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Status</Text>
            <View style={styles.statusValueContainer}>
              {isScanning && <ActivityIndicator size="small" color={colors.primary} />}
              <Text style={[styles.statusValue, { color: isScanning ? colors.success : '#999' }]}>
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

        {/* Error Display */}
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Error</Text>
            <Text style={styles.errorMessage}>{error}</Text>
          </View>
        )}

        {/* Control Buttons */}
        <View style={styles.buttonGroup}>
          <Button
            title={isScanning ? 'Stop Scanning' : 'Start Scanning'}
            onPress={handleToggleScanning}
            variant={isScanning ? 'danger' : 'primary'}
          />
        </View>

        {/* Network List */}
        <View style={styles.listContainer}>
          <Text style={styles.sectionTitle}>Available Networks</Text>
          <NetworkList
            networks={scans}
            getSignalBars={getSignalBars}
            getSignalQuality={getSignalQuality}
            isLoading={isScanning && scans.length === 0}
            maxNetworks={50}
          />
        </View>

        {/* Footer Info */}
        {scans.length > 0 && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Signal Strength Reference</Text>
            <View style={styles.infoRow}>
              <View style={[styles.colorBox, { backgroundColor: colors.success }]} />
              <Text style={styles.infoText}>Excellent (-50 dBm or higher)</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={[styles.colorBox, { backgroundColor: colors.warning }]} />
              <Text style={styles.infoText}>Good (-60 to -50 dBm)</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={[styles.colorBox, { backgroundColor: colors.danger }]} />
              <Text style={styles.infoText}>Fair (-70 to -60 dBm)</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={[styles.colorBox, { backgroundColor: '#CCC' }]} />
              <Text style={styles.infoText}>Weak (-100 to -70 dBm)</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  header: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
  },
  statusCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  statusValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  errorCard: {
    backgroundColor: '#FFE8E8',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.danger,
    marginBottom: spacing.xs,
  },
  errorMessage: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  buttonGroup: {
    marginBottom: spacing.lg,
  },
  listContainer: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  infoCard: {
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#B8E0F0',
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  colorBox: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: spacing.sm,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
  },
});