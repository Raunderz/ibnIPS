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
  const [imageFailed, setImageFailed] = useState(false);
  const source = FLOOR_PLAN_IMAGES[floor];

  useEffect(() => {
    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: animations.floorChangeMs,
      useNativeDriver: true,
    }).start();
    setImageFailed(false);
  }, [floor, opacity]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.imageWrapper, { opacity }]}>
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
    borderRadius: 8,
  },
  placeholderText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});