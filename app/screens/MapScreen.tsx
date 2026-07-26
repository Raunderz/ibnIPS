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
import { colors } from '../utils/colors';
import { spacing } from '../utils/spacing';
import { ROOMS, FLOOR_LABELS } from '../utils/constants';
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

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(16)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

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
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>ICPS</Text>
          <Text style={styles.headerSubtitle}>{FLOOR_LABELS[selectedFloor]}</Text>
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
          <View style={styles.liveDot} />
          <Text style={styles.roomText}>{nearestRoom ? nearestRoom.name : 'Locating...'}</Text>
        </View>
        {position ? (
          <View style={styles.confidenceBarTrack}>
            <View
              style={[
                styles.confidenceBarFill,
                { width: `${position.confidence}%` },
                position.confidence < 50 && styles.confidenceBarFillLow,
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  infoCard: {
    marginHorizontal: spacing.screenPaddingHorizontal,
    marginTop: spacing.componentSpacingVertical,
    backgroundColor: colors.card,
    borderRadius: spacing.borderRadiusStandard + 4,
    padding: spacing.cardPadding,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary,
    marginRight: 8,
  },
  roomText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  confidenceBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.secondaryButtonBg,
    overflow: 'hidden',
    marginBottom: 6,
  },
  confidenceBarFill: {
    height: '100%',
    backgroundColor: colors.secondary,
    borderRadius: 3,
  },
  confidenceBarFillLow: {
    backgroundColor: colors.warning,
  },
  confidenceText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingVertical: spacing.componentSpacingVertical,
  },
});