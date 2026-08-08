// ICPS/components/RoutePreviewList.tsx
// Container for all route cards plus aggregate header stats.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemeColors, ThemeColors } from '../utils/colors';
import { spacing } from '../utils/spacing';
import { FLOOR_LABELS } from '../utils/constants';
import { RouteCollection } from '../types';
import RouteEntryCard from './RouteEntryCard';

interface RoutePreviewListProps {
  routeCollection: RouteCollection;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
}

export default function RoutePreviewList({
  routeCollection,
  onEdit,
  onDelete,
}: RoutePreviewListProps) {
  const themeColors = useThemeColors();
  const styles = getStyles(themeColors);

  const floor = routeCollection.length > 0 ? routeCollection[0].floor : null;
  const totalSteps = routeCollection.reduce(
    (sum, entry) => sum + (entry.steps_from_previous ?? 0),
    0
  );

  return (
    <View>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{floor !== null ? FLOOR_LABELS[floor] : '—'}</Text>
          <Text style={styles.statLabel}>Floor</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{routeCollection.length}</Text>
          <Text style={styles.statLabel}>Locations</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalSteps}</Text>
          <Text style={styles.statLabel}>Total steps</Text>
        </View>
      </View>

      {routeCollection.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No locations tagged yet</Text>
        </View>
      ) : (
        routeCollection.map((entry, index) => (
          <RouteEntryCard
            key={entry.room_id + '-' + entry.timestamp}
            entry={entry}
            onEdit={() => onEdit(index)}
            onDelete={() => onDelete(index)}
          />
        ))
      )}
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    statsRow: {
      flexDirection: 'row',
      marginBottom: spacing.componentSpacingVertical,
    },
    statCard: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      marginHorizontal: 3,
      borderRadius: spacing.shapeMedium,
      backgroundColor: colors.surfaceContainerLow,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
    },
    statValue: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.primary,
    },
    statLabel: {
      marginTop: 2,
      fontSize: 12,
      color: colors.onSurfaceVariant,
    },
    emptyCard: {
      borderRadius: spacing.shapeMedium,
      backgroundColor: colors.surfaceContainerLow,
      padding: 24,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: colors.onSurfaceVariant,
    },
  });
