// ICPS/components/MapView.tsx
// Zoomable, pannable map with tagged locations and Wi-Fi signal visualization

import React, { useRef, useState, useEffect } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  Pressable,
} from 'react-native';
import { colors } from '../utils/colors';
import { ROOMS } from '../utils/constants';
import { FloorNumber, RouteEntry, NetworkReading, Room } from '../types';

interface TaggedLocation {
  x: number;
  y: number;
  label: string;
  order: number;
  floor: FloorNumber;
  confidence: number;
  networks: NetworkReading[];
}

interface MapViewProps {
  floor: FloorNumber;
  pinX: number;
  pinY: number;
  isPinStale?: boolean;
  taggedLocations: TaggedLocation[];
  onTagPress?: (tag: TaggedLocation) => void;
  rooms?: Room[];
}

const MAP_SIZE = 512; // logical map coordinate space (0-512)
const MIN_SCALE = 0.5;
const MAX_SCALE = 4;

export default function MapView({
  floor,
  pinX,
  pinY,
  isPinStale = false,
  taggedLocations,
  onTagPress,
  rooms = ROOMS,
}: MapViewProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  
  // Use refs to store current values for zoom calculations
  const scaleRef = useRef(1);
  const translateXRef = useRef(0);
  const translateYRef = useRef(0);
  
  scale.addListener(({ value }) => { scaleRef.current = value; });
  translateX.addListener(({ value }) => { translateXRef.current = value; });
  translateY.addListener(({ value }) => { translateYRef.current = value; });
  const [panResponder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (_, gestureState) => {
        translateX.setOffset(translateXRef.current);
        translateY.setOffset(translateYRef.current);
        translateX.setValue(0);
        translateY.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        translateX.setValue(gestureState.dx);
        translateY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        translateX.flattenOffset();
        translateY.flattenOffset();
      },
    })
  );

  const handleZoom = (factor: number, centerX?: number, centerY?: number) => {
    const currentScale = scaleRef.current;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, currentScale * factor));
    
    if (centerX !== undefined && centerY !== undefined) {
      // Zoom toward center point
      const dx = translateXRef.current;
      const dy = translateYRef.current;
      const ratio = newScale / currentScale;
      translateX.setValue(dx * ratio + centerX * (1 - ratio));
      translateY.setValue(dy * ratio + centerY * (1 - ratio));
    }
    scale.setValue(newScale);
  };

  const resetView = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
  };

  const animatedStyle: ViewStyle = {
    transform: [
      { translateX },
      { translateY },
      { scale },
    ],
  };

  const currentFloorTags = taggedLocations.filter((t) => t.floor === floor);
  const floorRooms = rooms.filter((r) => r.floor === floor);

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Animated.View style={[styles.mapWrapper, animatedStyle]}>
        {/* Grid background */}
        <View style={styles.grid} />
        
        {/* Corridors */}
        {floor === 0 && <View style={styles.corridorHorizontal} />}
        {floor === 1 && (
          <>
            <View style={styles.corridorHorizontal} />
            <View style={styles.corridorVertical} />
          </>
        )}
        {floor === 2 && <View style={styles.corridorHorizontal} />}
        {floor === 3 && <View style={styles.corridorHorizontal} />}

        {/* Rooms */}
        {floorRooms.map((room) => (
          <View
            key={room.id}
            style={[
              styles.room,
              {
                left: (room.x ?? 0) - 40,
                top: (room.y ?? 0) - 20,
              },
            ]}
          >
            <Text style={styles.roomLabel}>{room.name}</Text>
          </View>
        ))}

        {/* Tagged locations with Wi-Fi signal rings */}
        {currentFloorTags.map((tag) => (
          <TaggedLocationView
            key={tag.order}
            tag={tag}
            onPress={onTagPress}
            scale={scaleRef.current}
          />
        ))}

        {/* Current user position */}
        <UserPositionPin x={pinX} y={pinY} isStale={isPinStale} />

        {/* Floor label */}
        <View style={styles.floorLabelWrapper}>
          <Text style={styles.floorLabel}>Floor {floor === 0 ? 'G' : floor}</Text>
        </View>
      </Animated.View>

      {/* Zoom controls */}
      <View style={styles.zoomControls}>
        <ZoomButton onPress={() => handleZoom(1.5)} label="+" accessibilityLabel="Zoom in" />
        <ZoomButton onPress={() => handleZoom(1 / 1.5)} label="−" accessibilityLabel="Zoom out" />
        <ZoomButton onPress={resetView} label="⌂" accessibilityLabel="Reset view" />
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={styles.legendPin} />
          <Text style={styles.legendText}>Your Position</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendTag} />
          <Text style={styles.legendText}>Tagged Location</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendRing} />
          <Text style={styles.legendText}>Wi-Fi Coverage</Text>
        </View>
      </View>
    </View>
  );
}

interface TaggedLocationViewProps {
  tag: TaggedLocation;
  onPress?: (tag: TaggedLocation) => void;
  scale: number;
}

function TaggedLocationView({ tag, onPress, scale }: TaggedLocationViewProps) {
  const ringScale = useRef(new Animated.Value(0.5)).current;
  const ringOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ringScale, { toValue: 1.5, duration: 2000, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ]),
        Animated.timing(ringScale, { toValue: 0.5, duration: 0, useNativeDriver: true }),
        Animated.timing(ringOpacity, { toValue: 0.3, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, [ringScale, ringOpacity]);

  const ringStyle: ViewStyle = {
    position: 'absolute',
    left: tag.x - 50 * scale,
    top: tag.y - 50 * scale,
    width: 100 * scale,
    height: 100 * scale,
    borderRadius: 50 * scale,
    borderWidth: 2,
    borderColor: colors.primary,
    transform: [{ scale: ringScale }],
    opacity: ringOpacity,
  };

  return (
    <View>
      {/* Wi-Fi signal ring (animated) */}
      <Animated.View style={ringStyle} />
      
      {/* Tag pin */}
      <Pressable
        style={[
          styles.tagPin,
          { left: tag.x - 16, top: tag.y - 16 },
        ]}
        onPress={() => onPress?.(tag)}
        accessibilityLabel={`Tagged location ${tag.order}: ${tag.label}, confidence ${tag.confidence}%`}
      >
        <Text style={styles.tagPinNumber}>{tag.order}</Text>
      </Pressable>

      {/* Confidence indicator */}
      <View
        style={[
          styles.confidenceBadge,
          { left: tag.x + 16, top: tag.y - 16 },
        ]}
      >
        <Text style={styles.confidenceText}>{tag.confidence}%</Text>
      </View>
    </View>
  );
}

function UserPositionPin({ x, y, isStale }: { x: number; y: number; isStale: boolean }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.4, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        styles.userPin,
        { left: x - 10, top: y - 10, transform: [{ scale: pulse }] },
      ]}
      accessibilityLabel="Your current location"
    >
      <Animated.View
        style={[
          styles.userPinGlow,
          { opacity: isStale ? 0.1 : 0.3, transform: [{ scale: pulse }] },
        ]}
      />
      <View style={[styles.userPinDot, isStale && styles.userPinStale]} />
    </Animated.View>
  );
}

function ZoomButton({ onPress, label, accessibilityLabel }: { onPress: () => void; label: string; accessibilityLabel: string }) {
  return (
    <Pressable
      style={styles.zoomButton}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Text style={styles.zoomButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mapWrapper: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  grid: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
  },
  corridorHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: MAP_SIZE / 2,
    height: 2,
    marginTop: -1,
    backgroundColor: colors.outline,
    opacity: 0.3,
  },
  corridorVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: MAP_SIZE / 2,
    width: 2,
    marginLeft: -1,
    backgroundColor: colors.outline,
    opacity: 0.3,
  },
  room: {
    position: 'absolute',
    width: 80,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  tagPin: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  tagPinNumber: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  confidenceBadge: {
    position: 'absolute',
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 36,
  },
  confidenceText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  userPin: {
    position: 'absolute',
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userPinGlow: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  userPinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    opacity: 0.9,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  userPinStale: {
    backgroundColor: colors.disabled,
    opacity: 0.6,
  },
  floorLabelWrapper: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  floorLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  zoomControls: {
    position: 'absolute',
    right: 12,
    top: 12,
    flexDirection: 'column',
    gap: 8,
    zIndex: 10,
  },
  zoomButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  zoomButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
  },
  legend: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.outline,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendPin: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#fff',
  },
  legendTag: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#fff',
  },
  legendRing: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  legendText: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
});