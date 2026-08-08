// ICPS/components/FloorSelector.tsx

import React, { useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColors, useFloorColors, ThemeColors } from '../utils/colors';
import { spacing } from '../utils/spacing';
import { FloorNumber } from '../types';
import { FLOORS, FLOOR_LABELS, FLOOR_SHORT_LABELS } from '../utils/constants';

interface FloorSelectorProps {
  activeFloor: FloorNumber;
  onSelectFloor: (floor: FloorNumber) => void;
  useShortLabels?: boolean;
  floors?: FloorNumber[];
  getFloorLabel?: (floor: FloorNumber) => string;
  getFloorShortLabel?: (floor: FloorNumber) => string;
}

export default function FloorSelector({
  activeFloor,
  onSelectFloor,
  useShortLabels = false,
  floors,
  getFloorLabel,
  getFloorShortLabel,
}: FloorSelectorProps) {
  const [buttonWidth, setButtonWidth] = useState(0);
  const themeColors = useThemeColors();
  const activeFloorColors = useFloorColors();
  const styles = getStyles(themeColors);
  const pillPosition = useRef(new Animated.Value(0)).current;
  const floorList = floors ?? FLOORS;
  const activeIndex = floorList.indexOf(activeFloor);
  const activeColor = activeFloorColors[activeIndex] ?? themeColors.primary;

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
    setButtonWidth(totalWidth / floorList.length);
  };

  const labelFor = (floor: FloorNumber) =>
    getFloorLabel?.(floor) ?? FLOOR_LABELS[floor] ?? `Floor ${floor}`;
  const shortLabelFor = (floor: FloorNumber) =>
    getFloorShortLabel?.(floor) ?? FLOOR_SHORT_LABELS[floor] ?? String(floor);

  return (
    <View style={styles.row} onLayout={handleLayout}>
      {buttonWidth > 0 && (
        <Animated.View
          style={[
            styles.pill,
            {
              width: buttonWidth - 8,
              backgroundColor: activeColor,
              shadowColor: activeColor,
              transform: [{ translateX: Animated.add(pillPosition, new Animated.Value(4)) }],
            },
          ]}
        />
      )}
      {floorList.map((floor, i) => {
        const isActive = floor === activeFloor;
        return (
          <Pressable
            key={floor}
            onPress={() => onSelectFloor(floor)}
            accessibilityRole="button"
            accessibilityLabel={labelFor(floor)}
            accessibilityState={{ selected: isActive }}
            style={styles.button}
          >
            <View
              style={[
                styles.dot,
                { backgroundColor: isActive ? '#FFFFFF' : activeFloorColors[i] ?? themeColors.primary },
              ]}
            />
            <Text style={[styles.text, isActive && styles.textActive]}>
              {useShortLabels ? shortLabelFor(floor) : labelFor(floor)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginHorizontal: spacing.screenPaddingHorizontal,
    marginVertical: spacing.componentSpacingVertical,
    backgroundColor: colors.surfaceContainer, // Material 3 surface container background
    borderRadius: spacing.shapeFull, // MD3 Segmented Button fully rounded container
    padding: 4,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  pill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 0,
    borderRadius: spacing.shapeFull, // MD3 fully rounded active item
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  textActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});