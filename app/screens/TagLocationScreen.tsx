// ICPS/screens/TagLocationScreen.tsx
// Enhanced tag screen: route building with steps + direction (new.pdf).

import React, { useState, useEffect, useMemo } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import RoomSelector from '../components/RoomSelector';
import DirectionButtonGroup from '../components/DirectionButtonGroup';
import DirectionDisplay from '../components/DirectionDisplay';
import Button from '../components/Button';
import Toast from '../components/Toast';
import NetworkList from '../components/NetworkList';
import { useToast } from '../hooks/useToast';
import { useRoute } from '../hooks/useRoute';
import { useMockMode } from '../hooks/useMockMode';
import { useWifiScanning } from '../hooks/useWifiScanning';
import { usePosition } from '../hooks/usePosition';
import { useRooms } from '../hooks/useRooms';
import { useThemeColors, ThemeColors } from '../utils/colors';
import { spacing } from '../utils/spacing';
import { MAX_ROUTE_STEPS } from '../utils/constants';
import { Room, Direction, NetworkReading } from '../types';
import { Network } from '../services/wifiService';
import { getMockScenario } from '../services/mockDataService';
import { dedupeAndSortByStrength, clampRssi, isRssiUsable } from '../utils/wifi';
import { MIN_RSSI_THRESHOLD } from '../utils/constants';

export default function TagLocationScreen() {
  const router = useRouter();
  const { routeCollection, addToRoute, updateRoute } = useRoute();
  const { isMockMode, getMockBasePosition, activeScenario } = useMockMode();
  const rooms = useRooms();
  const wifi = useWifiScanning({ enabled: !isMockMode, pauseInBackground: true });
  const { position } = usePosition({
    isMockMode,
    mockBasePosition: getMockBasePosition(),
    realScans: wifi.scans,
    floor: routeCollection[0]?.floor ?? 0,
  });
  const { toast, showToast } = useToast();
  const themeColors = useThemeColors();
  const styles = getStyles(themeColors);

  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [stepsText, setStepsText] = useState('');
  const [selectedDirection, setSelectedDirection] = useState<Direction | null>(null);

  // Generate mock Wi-Fi scans that change with position in mock mode
  const mockScans = useMemo(() => {
    if (!isMockMode || !position || !activeScenario) return [];
    
    const baseNetworks = activeScenario.networks || [];
    // Add variation based on position to simulate moving around
    const posVariation = Math.sin(position.x * 0.01) * 10 + Math.cos(position.y * 0.01) * 10;
    const timeVariation = Math.sin(Date.now() / 2000) * 5;
    
    return baseNetworks.map((net, i) => {
      const rssiVariation = posVariation + timeVariation + (i * 3);
      const newRssi = Math.max(-100, Math.min(-30, net.rssi + rssiVariation));
      return {
        bssid: `mock-${net.id}`,
        ssid: net.name,
        rssi: clampRssi(newRssi),
        frequency: 2412 + (i * 5),
        timestamp: Date.now(),
      } as Network;
    }).filter(n => isRssiUsable(n.rssi));
  }, [isMockMode, position, activeScenario]);

  // Combine real and mock scans
  const allScans = isMockMode ? mockScans : wifi.scans;

  const isFirstTag = routeCollection.length === 0;
  const routeFloor = routeCollection[0]?.floor;
  // A route must stay on the floor it starts on; warn before a cross-floor pick.
  const floorMismatch =
    !isFirstTag && selectedRoom !== null && routeFloor !== undefined && selectedRoom.floor !== routeFloor;

  const handleContinueTagging = () => {
    if (!selectedRoom) {
      showToast('Please select a room', 'warning');
      return;
    }
    if (!position) {
      showToast('Waiting for location...', 'warning');
      return;
    }

    const currentPosition = { x: position.x, y: position.y, confidence: position.confidence };
    const currentNetworks: NetworkReading[] = allScans.map((s) => ({
      id: s.bssid,
      name: s.ssid ?? 'Unknown',
      rssi: s.rssi,
      timestamp: s.timestamp,
    }));

    if (!isFirstTag) {
      if (routeFloor !== undefined && selectedRoom.floor !== routeFloor) {
        showToast('All locations must be on the same floor', 'warning');
        return;
      }
      const steps = stepsText.trim() === '' ? null : Number(stepsText);
      if (steps === null || !Number.isInteger(steps) || steps <= 0 || steps > MAX_ROUTE_STEPS) {
        showToast('Steps must be a positive integer (max 9999)', 'warning');
        return;
      }
      if (!selectedDirection) {
        showToast('Please select a direction', 'warning');
        return;
      }
      addToRoute(selectedRoom.id, selectedRoom.name, selectedRoom.floor, currentPosition, currentNetworks);
      const newIndex = routeCollection.length;
      try {
        updateRoute(newIndex, { steps, direction: selectedDirection });
      } catch {
        showToast('Unable to add location', 'error');
        return;
      }
    } else {
      addToRoute(selectedRoom.id, selectedRoom.name, selectedRoom.floor, currentPosition, currentNetworks);
    }

    setSelectedRoom(null);
    setStepsText('');
    setSelectedDirection(null);
    showToast('Location added to route', 'success');
  };

  const handlePreviewRoute = () => {
    router.push('/route-preview');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <RoomSelector rooms={rooms} selectedRoom={selectedRoom} onSelect={setSelectedRoom} />
        {floorMismatch ? (
          <Text style={styles.floorWarning}>
            This room is on a different floor than the route start — all locations
            must be on the same floor.
          </Text>
        ) : null}

        {position && (
          <View style={styles.positionCard}>
            <Text style={styles.positionLabel}>Current Position</Text>
            <Text style={styles.positionValue}>
              X: {Math.round(position.x)}  Y: {Math.round(position.y)}  Floor: {position.floor}
            </Text>
            <Text style={styles.positionConfidence}>
              Confidence: {position.confidence}%  |  Networks: {allScans.length}
            </Text>
          </View>
        )}

        {/* Live Wi-Fi Networks */}
        <View style={styles.networkSection}>
          <Text style={styles.sectionTitle}>Live Wi-Fi Coverage</Text>
          <NetworkList
            networks={allScans}
            isLoading={isMockMode && !position}
            maxNetworks={10}
          />
        </View>

        <View style={{ height: spacing.componentSpacingVertical * 2 }} />

        <Text style={styles.label}>Steps from previous:</Text>
        <TextInput
          style={styles.input}
          value={stepsText}
          onChangeText={setStepsText}
          placeholder="e.g., 42"
          placeholderTextColor={themeColors.onSurfaceVariant}
          keyboardType="number-pad"
          editable={!isFirstTag}
        />
        {isFirstTag ? (
          <Text style={styles.helperText}>Disabled — first location has no previous hop</Text>
        ) : null}

        <View style={{ height: spacing.componentSpacingVertical * 2 }} />

        <Text style={styles.label}>Direction traveled:</Text>
        <DirectionButtonGroup
          selectedDirection={selectedDirection}
          onSelect={setSelectedDirection}
          disabled={isFirstTag}
        />
        <View style={{ height: spacing.componentSpacingVertical }} />
        <DirectionDisplay direction={isFirstTag ? null : selectedDirection} />

        <View style={{ height: spacing.componentSpacingVertical * 2 }} />

        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>
            Tagged so far: {routeCollection.length} location{routeCollection.length === 1 ? '' : 's'}
          </Text>
        </View>

        <View style={{ height: spacing.componentSpacingVertical * 2 }} />

        <Button label="Continue Tagging" onPress={handleContinueTagging} variant="primary" />
        <View style={{ height: spacing.componentSpacingVertical }} />
        <Button
          label="Preview Route"
          onPress={handlePreviewRoute}
          variant="secondary"
          disabled={routeCollection.length === 0}
        />
      </ScrollView>

      <Toast toast={toast} />
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
    label: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.primary,
      marginBottom: 6,
      paddingLeft: 4,
    },
    input: {
      borderWidth: 1.5,
      borderColor: colors.outline,
      borderRadius: spacing.shapeSmall,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.surfaceContainerLow,
      minHeight: 52,
      fontSize: 16,
      color: colors.onSurface,
    },
    helperText: {
      marginTop: 6,
      fontSize: 12,
      color: colors.onSurfaceVariant,
      fontStyle: 'italic',
    },
    floorWarning: {
      marginTop: 8,
      fontSize: 12,
      color: colors.error,
      fontWeight: '500',
      paddingHorizontal: 4,
    },
    summaryCard: {
      borderRadius: spacing.shapeMedium,
      backgroundColor: colors.surfaceContainerLow,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: 'center',
    },
    summaryText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
      letterSpacing: 0.2,
    },
    positionCard: {
      backgroundColor: colors.surfaceContainerLow,
      borderRadius: spacing.shapeMedium,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      marginBottom: spacing.componentSpacingVertical,
    },
    positionLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
      marginBottom: 4,
    },
    positionValue: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.onSurface,
      marginBottom: 4,
    },
    positionConfidence: {
      fontSize: 13,
      color: colors.onSurfaceVariant,
    },
    networkSection: {
      marginTop: spacing.componentSpacingVertical,
      marginBottom: spacing.componentSpacingVertical,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.onSurface,
      marginBottom: spacing.componentSpacingVertical,
    },
  });
