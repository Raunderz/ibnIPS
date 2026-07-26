// ICPS/screens/MapScreen.tsx

import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MapCanvas from '../components/MapCanvas';
import FloorSelector from '../components/FloorSelector';
import Button from '../components/Button';
import Toast from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { usePosition } from '../hooks/usePosition';
import { useMockMode } from '../hooks/useMockMode';
import { useToast } from '../hooks/useToast';
import { colors } from '../utils/colors';
import { spacing } from '../utils/spacing';
import { ROOMS } from '../utils/constants';
import { FloorNumber } from '../types';

export default function MapScreen() {
  const navigation = useNavigation<any>();
  const { isMockMode, getMockBasePosition } = useMockMode();
  const [selectedFloor, setSelectedFloor] = useState<FloorNumber>(1);
  const { position, status, refresh } = usePosition({
    isMockMode,
    mockBasePosition: getMockBasePosition(),
  });
  const { toast, showToast } = useToast();

  const nearestRoom = ROOMS.find((r) => r.floor === (position?.floor ?? selectedFloor));

  const handleRefresh = async () => {
    await refresh();
    if (status === 'error') {
      showToast('Unable to update location', 'error');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <FloorSelector activeFloor={selectedFloor} onSelectFloor={setSelectedFloor} />

      {!position ? (
        <LoadingSpinner label="Loading location..." />
      ) : (
        <MapCanvas
          floor={selectedFloor}
          pinX={position.x}
          pinY={position.y}
          isPinStale={status === 'error'}
        />
      )}

      <View style={styles.infoCard}>
        <Text style={styles.roomText}>
          Nearest Room: {nearestRoom ? nearestRoom.name : '—'}
        </Text>
        {position ? (
          <Text style={styles.confidenceText}>Confidence: {position.confidence}%</Text>
        ) : null}
      </View>

      <View style={styles.actionsRow}>
        <Button
          label="Tag Location"
          onPress={() => navigation.navigate('TagLocation')}
          variant="primary"
          disabled={status === 'loading'}
        />
        <View style={{ width: spacing.componentSpacingVertical }} />
        <Button
          label="Settings"
          onPress={() => navigation.navigate('Debug')}
          variant="secondary"
          disabled={status === 'loading'}
        />
        <View style={{ width: spacing.componentSpacingVertical }} />
        <Button
          label="Refresh"
          onPress={handleRefresh}
          variant="secondary"
          disabled={status === 'loading'}
        />
      </View>

      <Toast toast={toast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  infoCard: {
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingVertical: spacing.componentSpacingVertical,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  roomText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  confidenceText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingBottom: spacing.componentSpacingVertical,
  },
});