// ICPS/components/MapCanvas.tsx

import React, { useEffect, useRef, useState } from 'react';
import { Animated, ImageSourcePropType, StyleSheet, Text, View } from 'react-native';
import UserPin from './UserPin';
import { colors } from '../utils/colors';
import { animations } from '../utils/spacing';
import { FloorNumber } from '../types';

// Floor plan images live in assets/floor_plans/ per Appendix C.
// Swap these requires for your actual exported images.
const FLOOR_PLAN_IMAGES: Record<FloorNumber, ImageSourcePropType | null> = {
  0: null, // require('../assets/floor_plans/floor_ground.png')
  1: null, // require('../assets/floor_plans/floor_1.png')
  2: null, // require('../assets/floor_plans/floor_2.png')
  3: null, // require('../assets/floor_plans/floor_3.png')
};

interface MapCanvasProps {
  floor: FloorNumber;
  pinX: number;
  pinY: number;
  isPinStale?: boolean;
}

export default function MapCanvas({ floor, pinX, pinY, isPinStale = false }: MapCanvasProps) {
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.97)).current;
  const [imageFailed, setImageFailed] = useState(false);
  const source = FLOOR_PLAN_IMAGES[floor];

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
    setImageFailed(false);
  }, [floor, opacity, scale]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.imageWrapper, { opacity, transform: [{ scale }] }]}
      >
        {source && !imageFailed ? (
          <Animated.Image
            source={source}
            style={styles.image}
            resizeMode="contain"
            onError={() => setImageFailed(true)}
            accessibilityLabel={`Floor ${floor} plan with your position marked`}
          />
        ) : (
          <View style={styles.placeholder}>
            <View style={styles.placeholderIcon} />
            <Text style={styles.placeholderText}>Floor plan unavailable</Text>
          </View>
        )}
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
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    backgroundColor: colors.secondaryButtonBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  placeholderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.disabled,
    marginBottom: 12,
  },
  placeholderText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
});