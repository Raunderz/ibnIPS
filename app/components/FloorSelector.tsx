// ICPS/components/FloorSelector.tsx

import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { colors } from '../utils/colors';
import { spacing } from '../utils/spacing';
import { FloorNumber } from '../types';
import { FLOORS } from '../utils/constants';

interface FloorSelectorProps {
  activeFloor: FloorNumber;
  onSelectFloor: (floor: FloorNumber) => void;
}

export default function FloorSelector({ activeFloor, onSelectFloor }: FloorSelectorProps) {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 480; // spec section 10.1 breakpoint

  return (
    <View style={styles.row}>
      {FLOORS.map((floor) => {
        const isActive = floor === activeFloor;
        return (
          <Pressable
            key={floor}
            onPress={() => onSelectFloor(floor)}
            accessibilityRole="button"
            accessibilityLabel={`Floor ${floor}`}
            accessibilityState={{ selected: isActive }}
            style={[styles.button, isActive && styles.buttonActive]}
          >
            <Text style={[styles.text, isActive && styles.textActive]}>
              {isSmallScreen ? `F${floor}` : `Floor ${floor}`}
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingVertical: spacing.componentSpacingVertical,
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 10,
    borderRadius: spacing.borderRadiusStandard,
    backgroundColor: colors.secondaryButtonBg,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonActive: {
    backgroundColor: colors.primary,
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