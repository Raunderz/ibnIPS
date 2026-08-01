// ICPS/screens/MapScreen.tsx

import React, { useEffect, useRef, useState } from 'react';
import { Animated, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MapCanvas from '../components/MapCanvas';
import FloorSelector from '../components/FloorSelector';
import Button from '../components/Button';
import Toast from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { usePosition } from '../hooks/usePosition';
import { useMockMode } from '../hooks/useMockMode';
import { useToast } from '../hooks/useToast';
import { useThemeColors, useFloorColors, ThemeColors } from '../utils/colors';
import { spacing } from '../utils/spacing';
import { ROOMS, FLOORS, FLOOR_LABELS } from '../utils/constants';
import { FloorNumber } from '../types';

export default function MapScreen() {
  const navigation = useNavigation<any>();
  const { isMockMode, getMockBasePosition } = useMockMode();
  const [selectedFloor, setSelectedFloor] = useState<FloorNumber>(0);
  const { position, status, refresh } = usePosition({
    isMockMode,
    mockBasePosition: getMockBasePosition(),
  });
  const { toast, showToast } = useToast();
  const themeColors = useThemeColors();
  const activeFloorColors = useFloorColors();
  const styles = getStyles(themeColors);

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(16)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  const floorColor = activeFloorColors[FLOORS.indexOf(selectedFloor)] ?? themeColors.primary;

  useEffect(() => {
    Animated.timing(headerOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 500,
        delay: 150,
        useNativeDriver: true,
      }),
      Animated.spring(cardTranslateY, {
        toValue: 0,
        delay: 150,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [cardOpacity, cardTranslateY, headerOpacity]);

  const nearestRoom = ROOMS.find((r) => r.floor === (position?.floor ?? selectedFloor));

  const handleRefresh = async () => {
    await refresh();
    if (status === 'error') {
      showToast('Unable to update location', 'error');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={{ opacity: headerOpacity }}>
        <View style={[styles.headerBanner, { backgroundColor: floorColor }]}>
          <Text style={styles.headerTitle}>ICPS</Text>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{FLOOR_LABELS[selectedFloor]}</Text>
          </View>
        </View>
        <FloorSelector activeFloor={selectedFloor} onSelectFloor={setSelectedFloor} />
      </Animated.View>

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

      <Animated.View
        style={[
          styles.infoCard,
          { opacity: cardOpacity, transform: [{ translateY: cardTranslateY }] },
        ]}
      >
        <View style={styles.infoRow}>
          <View style={[styles.liveDot, { backgroundColor: themeColors.secondary }]} />
          <Text style={styles.roomText}>{nearestRoom ? nearestRoom.name : 'Locating...'}</Text>
        </View>
        {position ? (
          <View style={styles.confidenceBarTrack}>
            <View
              style={[
                styles.confidenceBarFill,
                {
                  width: `${position.confidence}%`,
                  backgroundColor:
                    position.confidence >= 70
                      ? '#2E7D32'
                      : position.confidence >= 40
                      ? themeColors.warning
                      : themeColors.error,
                },
              ]}
            />
          </View>
        ) : null}
        {position ? (
          <Text style={styles.confidenceText}>Confidence: {position.confidence}%</Text>
        ) : null}
      </Animated.View>

      <View style={styles.actionsRow}>
        <View style={{ flex: 1 }}>
          <Button
            label="Tag Location"
            onPress={() => navigation.navigate('TagLocation')}
            variant="primary"
            disabled={status === 'loading'}
          />
        </View>
        <View style={{ width: spacing.componentSpacingVertical }} />
        <View style={{ flex: 1 }}>
          <Button
            label="Settings"
            onPress={() => navigation.navigate('Debug')}
            variant="secondary"
            disabled={status === 'loading'}
          />
        </View>
        <View style={{ width: spacing.componentSpacingVertical }} />
        <View style={{ flex: 1 }}>
          <Button
            label="Refresh"
            onPress={handleRefresh}
            variant="secondary"
            disabled={status === 'loading'}
          />
        </View>
      </View>

      <Toast toast={toast} />
    </SafeAreaView>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: spacing.screenPaddingHorizontal,
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: spacing.shapeLarge, // MD3 Large Card Shape (16dp)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  headerBadge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: spacing.shapeFull,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  infoCard: {
    marginHorizontal: spacing.screenPaddingHorizontal,
    marginTop: spacing.componentSpacingVertical,
    backgroundColor: colors.surfaceContainerLow, // MD3 card surface
    borderRadius: spacing.shapeLarge, // MD3 Large card shape (16dp)
    padding: spacing.cardPadding + 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2, // MD3 Elevated Card elevation
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  roomText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.onSurface,
    letterSpacing: 0.1,
  },
  confidenceBarTrack: {
    height: 8,
    borderRadius: spacing.shapeFull,
    backgroundColor: colors.surfaceContainerHigh,
    overflow: 'hidden',
    marginBottom: 8,
  },
  confidenceBarFill: {
    height: '100%',
    borderRadius: spacing.shapeFull,
  },
  confidenceText: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingVertical: spacing.componentSpacingVertical + 4,
  },
});