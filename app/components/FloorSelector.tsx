// ICPS/components/FloorSelector.tsx

import React, { useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../utils/colors';
import { spacing } from '../utils/spacing';
import { FloorNumber } from '../types';
import { FLOORS, FLOOR_LABELS, FLOOR_SHORT_LABELS } from '../utils/constants';

interface FloorSelectorProps {
  activeFloor: FloorNumber;
  onSelectFloor: (floor: FloorNumber) => void;
  useShortLabels?: boolean;
}

export default function FloorSelector({
  activeFloor,
  onSelectFloor,
  useShortLabels = false,
}: FloorSelectorProps) {
  const [buttonWidth, setButtonWidth] = useState(0);
  const pillPosition = useRef(new Animated.Value(0)).current;
  const activeIndex = FLOORS.indexOf(activeFloor);

  useEffect(() => {
    if (buttonWidth > 0) {
      Animated.spring(pillPosition, {
        toValue: activeIndex * buttonWidth,
        useNativeDriver: true,
        friction: 8,
        tension: 60,
      }).start();
    }
  }, [activeIndex, buttonWidth, pillPosition]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const totalWidth = e.nativeEvent.layout.width;
    setButtonWidth(totalWidth / FLOORS.length);
  };

  return (
    <View style={styles.row} onLayout={handleLayout}>
      {buttonWidth > 0 && (
        <Animated.View
          style={[
            styles.pill,
            {
              width: buttonWidth - 8,
              transform: [{ translateX: Animated.add(pillPosition, new Animated.Value(4)) }],
            },
          ]}
        />
      )}
      {FLOORS.map((floor) => {
        const isActive = floor === activeFloor;
        return (
          <Pressable
            key={floor}
            onPress={() => onSelectFloor(floor)}
            accessibilityRole="button"
            accessibilityLabel={FLOOR_LABELS[floor]}
            accessibilityState={{ selected: isActive }}
            style={styles.button}
          >
            <Text style={[styles.text, isActive && styles.textActive]}>
              {useShortLabels ? FLOOR_SHORT_LABELS[floor] : FLOOR_LABELS[floor]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginHorizontal: spacing.screenPaddingHorizontal,
    marginVertical: spacing.componentSpacingVertical,
    backgroundColor: colors.secondaryButtonBg,
    borderRadius: spacing.borderRadiusStandard + 4,
    padding: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  pill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 0,
    backgroundColor: colors.primary,
    borderRadius: spacing.borderRadiusStandard,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  textActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});