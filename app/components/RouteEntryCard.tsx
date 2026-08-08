// ICPS/components/RouteEntryCard.tsx
// Individual route location card: order + room name + steps/direction + actions.

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColors, ThemeColors } from '../utils/colors';
import { spacing } from '../utils/spacing';
import { RouteEntry, DIRECTION_LABELS, DIRECTION_ARROWS } from '../types';

interface RouteEntryCardProps {
  entry: RouteEntry;
  onEdit: () => void;
  onDelete: () => void;
}

export default function RouteEntryCard({ entry, onEdit, onDelete }: RouteEntryCardProps) {
  const themeColors = useThemeColors();
  const styles = getStyles(themeColors);
  const isFirst = entry.order === 1;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.orderBadge}>
          <Text style={styles.orderText}>{entry.order}</Text>
        </View>
        <Text style={styles.roomName}>{entry.room_name}</Text>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={onEdit}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${entry.room_name}`}
          style={styles.actionButton}
        >
          <Text style={styles.actionText}>Edit</Text>
        </Pressable>
        <Pressable
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${entry.room_name}`}
          style={[styles.actionButton, styles.deleteButton]}
        >
          <Text style={[styles.actionText, styles.deleteText]}>✕</Text>
        </Pressable>
      </View>

      <Text style={isFirst ? styles.firstText : styles.hopText}>
        {isFirst
          ? 'No previous location'
          : `${DIRECTION_ARROWS[entry.direction ?? 'N']} ${entry.direction ? DIRECTION_LABELS[entry.direction] : ''}, ${entry.steps_from_previous ?? 0} steps`}
      </Text>
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      borderRadius: spacing.shapeMedium,
      backgroundColor: colors.surfaceContainerLow,
      padding: spacing.cardPadding,
      marginBottom: spacing.componentSpacingVertical,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    orderBadge: {
      width: 24,
      height: 24,
      borderRadius: spacing.shapeFull,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    orderText: {
      color: colors.onPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    roomName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.onSurface,
      flexShrink: 1,
    },
    actionButton: {
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: spacing.shapeFull,
      backgroundColor: colors.secondaryContainer,
      marginLeft: 8,
    },
    deleteButton: {
      backgroundColor: colors.errorContainer,
    },
    actionText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.onSecondaryContainer,
    },
    deleteText: {
      color: colors.onErrorContainer,
      fontSize: 13,
    },
    firstText: {
      marginTop: 8,
      fontSize: 12,
      color: colors.onSurfaceVariant,
      fontStyle: 'italic',
    },
    hopText: {
      marginTop: 8,
      fontSize: 12,
      color: colors.onSurfaceVariant,
      letterSpacing: 0.2,
    },
  });
