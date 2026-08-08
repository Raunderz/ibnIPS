// ICPS/components/MapCanvas.tsx

import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import UserPin from './UserPin';
import { colors } from '../utils/colors';
import { animations } from '../utils/spacing';
import { FloorNumber } from '../types';
import { ROOMS } from '../utils/constants';

// Floor plan background - draws a simple building layout per floor
function FloorPlanBackground({ floor }: { floor: FloorNumber }) {
  const floorRooms = ROOMS.filter((r) => r.floor === floor);

  return (
    <View style={styles.floorPlan}>
      {/* Grid background */}
      <View style={styles.grid} />

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

      {/* Corridors / hallways - simple connecting lines */}
      {floor === 0 && (
        <View style={styles.corridorHorizontal} />
      )}
      {floor === 1 && (
        <>
          <View style={styles.corridorHorizontal} />
          <View style={styles.corridorVertical} />
        </>
      )}
      {floor === 2 && (
        <View style={styles.corridorHorizontal} />
      )}
      {floor === 3 && (
        <View style={styles.corridorHorizontal} />
      )}

      {/* Floor label */}
      <View style={styles.floorLabelWrapper}>
        <Text style={styles.floorLabel}>Floor {floor === 0 ? 'G' : floor}</Text>
      </View>
    </View>
  );
}

interface TaggedPinProps {
  x: number;
  y: number;
  label: string;
  order: number;
  isCurrentFloor: boolean;
}

function TaggedPin({ x, y, label, order, isCurrentFloor }: TaggedPinProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: isCurrentFloor ? 1 : 0.3,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isCurrentFloor, opacity, scale]);

  return (
    <Animated.View
      style={[
        styles.taggedWrapper,
        { transform: [{ translateX: x - 16 }, { translateY: y - 16 }, { scale }] },
        { opacity },
      ]}
      accessibilityLabel={`Tagged location ${order}: ${label}`}
    >
      <View style={[styles.taggedPin, isCurrentFloor ? styles.taggedPinActive : styles.taggedPinInactive]}>
        <Text style={styles.taggedPinNumber}>{order}</Text>
      </View>
      <View style={styles.taggedPinGlow} />
    </Animated.View>
  );
}

interface MapCanvasProps {
  floor: FloorNumber;
  pinX: number;
  pinY: number;
  isPinStale?: boolean;
  taggedLocations?: Array<{ x: number; y: number; label: string; order: number; floor: FloorNumber }>;
}

export default function MapCanvas({ floor, pinX, pinY, isPinStale = false, taggedLocations = [] }: MapCanvasProps) {
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.97)).current;

  useEffect(() => {
    opacity.setValue(0);
    scale.setValue(0.97);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: animations.floorChangeMs + 100,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 9,
        tension: 60,
      }),
    ]).start();
  }, [floor, opacity, scale]);

  const currentFloorTags = taggedLocations.filter((t) => t.floor === floor);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.imageWrapper, { opacity, transform: [{ scale }] }]}
      >
        <FloorPlanBackground floor={floor} />
        {currentFloorTags.map((tag) => (
          <TaggedPin
            key={tag.order}
            x={tag.x}
            y={tag.y}
            label={tag.label}
            order={tag.order}
            isCurrentFloor={true}
          />
        ))}
        <UserPin x={pinX} y={pinY} isStale={isPinStale} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 1,
    maxWidth: 600,
    alignSelf: 'center',
    paddingHorizontal: 8,
  },
  imageWrapper: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  floorPlan: {
    flex: 1,
    position: 'relative',
    backgroundColor: colors.surfaceContainerLow,
  },
  grid: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
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
  corridorHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 2,
    marginTop: -1,
    backgroundColor: colors.outline,
    opacity: 0.3,
  },
  corridorVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 2,
    marginLeft: -1,
    backgroundColor: colors.outline,
    opacity: 0.3,
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
  taggedWrapper: {
    position: 'absolute',
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taggedPin: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  taggedPinActive: {
    backgroundColor: colors.primary,
  },
  taggedPinInactive: {
    backgroundColor: colors.disabled,
    opacity: 0.5,
  },
  taggedPinNumber: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  taggedPinGlow: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    opacity: 0.3,
  },
});