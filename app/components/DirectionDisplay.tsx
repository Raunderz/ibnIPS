// ICPS/components/DirectionDisplay.tsx
// Shows the currently selected travel direction as text + icon.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemeColors, ThemeColors } from '../utils/colors';
import { spacing } from '../utils/spacing';
import { Direction, DIRECTION_LABELS, DIRECTION_ARROWS } from '../types';

interface DirectionDisplayProps {
  direction: Direction | null;
}

export default function DirectionDisplay({ direction }: DirectionDisplayProps) {
  const themeColors = useThemeColors();
  const styles = getStyles(themeColors);

  if (!direction) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>— No direction selected</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.containerSelected]}>
      <Text style={styles.arrow}>{DIRECTION_ARROWS[direction]}</Text>
      <Text style={styles.text}>
        {DIRECTION_LABELS[direction]} ({direction})
      </Text>
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: spacing.shapeMedium,
      backgroundColor: colors.surfaceContainerLow,
      borderWidth: 1.5,
      borderColor: colors.outlineVariant,
    },
    containerSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryContainer,
    },
    arrow: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.onPrimaryContainer,
      marginRight: 8,
    },
    text: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.onPrimaryContainer,
      letterSpacing: 0.2,
    },
    empty: {
      fontSize: 14,
      color: colors.onSurfaceVariant,
    },
  });
