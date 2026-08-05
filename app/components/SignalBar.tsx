// ICPS/components/SignalBar.tsx
// Visual Wi-Fi signal strength bar for a single network.

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useThemeColors } from '../utils/colors';
import { getSignalBars } from '../utils/wifi';

interface SignalBarProps {
  rssi: number;
}

const BAR_COLORS = [
  '#9E9E9E', // 0 - unusable (grey)
  '#F44336', // 1 - red
  '#FF9800', // 2 - orange
  '#FFC107', // 3 - amber
  '#FFEB3B', // 4 - yellow
  '#CDDC39', // 5 - lime
  '#8BC34A', // 6 - light green
  '#4CAF50', // 7 - green
  '#2E7D32', // 8 - strong green
];

export default function SignalBar({ rssi }: SignalBarProps) {
  const themeColors = useThemeColors();
  const bars = getSignalBars(rssi);
  const color = BAR_COLORS[bars] ?? BAR_COLORS[0];

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
    minWidth: 60,
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
