// ICPS/components/DirectionButtonGroup.tsx
// 8-button compass (N, NE, E, SE, S, SW, W, NW) for route direction selection.

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColors, ThemeColors } from '../utils/colors';
import { spacing } from '../utils/spacing';
import { Direction, DIRECTION_LABELS } from '../types';

interface DirectionButtonGroupProps {
  selectedDirection: Direction | null;
  onSelect: (direction: Direction) => void;
  disabled?: boolean;
}

// Compass grid: 3 columns × 5 rows, "" = empty cell.
const COMPASS_LAYOUT: Array<Array<Direction | ''>> = [
  ['', 'N', ''],
  ['NW', '', 'NE'],
  ['W', '', 'E'],
  ['SW', '', 'SE'],
  ['', 'S', ''],
];

const LABEL_SHORTCUTS: Partial<Record<Direction, string>> = {
  N: 'N',
  NE: 'NE',
  E: 'E',
  SE: 'SE',
  S: 'S',
  SW: 'SW',
  W: 'W',
  NW: 'NW',
};

export default function DirectionButtonGroup({
  selectedDirection,
  onSelect,
  disabled = false,
}: DirectionButtonGroupProps) {
  const themeColors = useThemeColors();
  const styles = getStyles(themeColors);

  return (
    <View style={styles.compass}>
      {COMPASS_LAYOUT.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((direction, colIndex) => {
            if (!direction) {
              return <View key={colIndex} style={styles.cell} />;
            }
            const isSelected = selectedDirection === direction;
            const label = LABEL_SHORTCUTS[direction] ?? direction;
            const fullLabel = DIRECTION_LABELS[direction];
            return (
              <View key={colIndex} style={styles.cell}>
                <Pressable
                  onPress={() => onSelect(direction)}
                  disabled={disabled}
                  accessibilityRole="button"
                  accessibilityLabel={`Direction: ${fullLabel}`}
                  accessibilityState={{ selected: isSelected, disabled }}
                  style={[
                    styles.button,
                    isSelected && styles.buttonSelected,
                    disabled && styles.buttonDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      isSelected && styles.buttonTextSelected,
                      disabled && styles.buttonTextDisabled,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    compass: {
      alignSelf: 'center',
    },
    row: {
      flexDirection: 'row',
    },
    cell: {
      width: 52,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    button: {
      width: 42,
      height: 42,
      borderRadius: spacing.shapeFull,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceContainerHigh,
      borderWidth: 1.5,
      borderColor: colors.outlineVariant,
    },
    buttonSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    buttonDisabled: {
      opacity: 0.38,
    },
    buttonText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.onSurface,
    },
    buttonTextSelected: {
      color: colors.onPrimary,
    },
    buttonTextDisabled: {
      color: colors.onSurfaceVariant,
    },
  });
