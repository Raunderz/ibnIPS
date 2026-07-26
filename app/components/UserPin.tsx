// ICPS/components/UserPin.tsx

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { colors } from '../utils/colors';
import { animations } from '../utils/spacing';

interface UserPinProps {
  x: number;
  y: number;
  isStale?: boolean; // grayed out if no fresh position (spec 12.1 / 13.2)
  animateMovement?: boolean; // respects user's pin animation preference
}

export default function UserPin({ x, y, isStale = false, animateMovement = true }: UserPinProps) {
  const translateX = useRef(new Animated.Value(x)).current;
  const translateY = useRef(new Animated.Value(y)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (animateMovement) {
      Animated.timing(translateX, {
        toValue: x,
        duration: animations.pinUpdateMs,
        useNativeDriver: true,
      }).start();
      Animated.timing(translateY, {
        toValue: y,
        duration: animations.pinUpdateMs,
        useNativeDriver: true,
      }).start();
    } else {
      translateX.setValue(x);
      translateY.setValue(y);
    }
  }, [x, y, animateMovement, translateX, translateY]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.6, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      accessibilityLabel="Your current location"
      style={[
        styles.wrapper,
        { transform: [{ translateX }, { translateY }] },
      ]}
    >
      <Animated.View
        style={[
          styles.glow,
          { opacity: isStale ? 0.15 : 0.25, transform: [{ scale: pulse }] },
        ]}
      />
      <Animated.View style={[styles.dot, isStale && styles.staleDot]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    height: 20,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    opacity: 0.85,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  staleDot: {
    backgroundColor: colors.disabled,
    opacity: 0.6,
  },
  glow: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
});