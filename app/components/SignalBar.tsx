import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useThemeColors } from '../utils/colors';

interface SignalBarProps {
  rssi: number;
}

export default function SignalBar({ rssi }: SignalBarProps) {
  const themeColors = useThemeColors();
  let bars = 0;
  let color: string = themeColors.onSurfaceVariant;

  // Signal strength threshold logic from spec
  if (rssi >= -50) {
    bars = 8;
    color = '#4CAF50'; // Green
  } else if (rssi >= -60) {
    bars = 7;
    color = '#8BC34A'; // Light Green
  } else if (rssi >= -70) {
    bars = 6;
    color = '#CDDC39'; // Lime
  } else if (rssi >= -80) {
    bars = 5;
    color = '#FFEB3B'; // Yellow
  } else if (rssi >= -90) {
    bars = 4;
    color = '#FF9800'; // Orange
  } else if (rssi >= -100) {
    bars = 2;
    color = '#F44336'; // Red
  } else {
    bars = 0;
    color = '#9E9E9E'; // Grey (⊗)
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.dbText, { color }]}>{rssi} dBm</Text>
      <View style={styles.barContainer}>
        {bars > 0 ? (
          Array.from({ length: 8 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.barSegment,
                {
                  backgroundColor: i < bars ? color : themeColors.border,
                  height: 4 + i * 2, // Progressive bar heights
                },
              ]}
            />
          ))
        ) : (
          <Text style={[styles.unusableText, { color }]}>⊗</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dbText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 10,
    minWidth: 55,
    textAlign: 'right',
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 20,
    width: 48,
    justifyContent: 'space-between',
  },
  barSegment: {
    width: 4,
    borderRadius: 2,
  },
  unusableText: {
    fontSize: 18,
    fontWeight: 'bold',
    width: 48,
    textAlign: 'center',
  },
});