// ICPS/screens/RoutePreviewScreen.tsx
// Shows all tagged locations, allows edit/delete, submits route to backend.

import React, { useEffect, useState } from 'react';
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeColors, ThemeColors } from '../utils/colors';
import { spacing } from '../utils/spacing';
import { useRoute } from '../hooks/useRoute';
import { useRooms } from '../hooks/useRooms';
import { useToast } from '../hooks/useToast';
import { submitRoute } from '../services/routeService';
import { Direction, RouteEntry, Room } from '../types';
import Button from '../components/Button';
import Toast from '../components/Toast';
import RoutePreviewList from '../components/RoutePreviewList';
import ConfirmDialog from '../components/ConfirmDialog';
import RoomSelector from '../components/RoomSelector';
import DirectionButtonGroup from '../components/DirectionButtonGroup';
import DirectionDisplay from '../components/DirectionDisplay';
import { MAX_ROUTE_STEPS } from '../utils/constants';

export default function RoutePreviewScreen() {
  const router = useRouter();
  const { routeCollection, updateRoute, deleteFromRoute, clearRoute } = useRoute();
  const rooms = useRooms();
  const { toast, showToast } = useToast();
  const themeColors = useThemeColors();
  const styles = getStyles(themeColors);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (routeCollection.length === 0) {
      showToast('No locations tagged yet', 'warning');
      setTimeout(() => router.replace('/'), 600);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEdit = (index: number) => setEditingIndex(index);
  const handleDeletePress = (index: number) => setDeletingIndex(index);

  const handleDeleteConfirm = () => {
    if (deletingIndex === null) return;
    deleteFromRoute(deletingIndex);
    setDeletingIndex(null);
    showToast('Location removed from route', 'info');
  };

  const handleCancel = () => {
    clearRoute();
    router.replace('/');
  };

  const handleSubmit = async () => {
    if (routeCollection.length < 2) {
      showToast('Route requires at least 2 locations', 'warning');
      return;
    }
    setSubmitting(true);
    const result = await submitRoute(routeCollection);
    setSubmitting(false);

    if (result.ok) {
      showToast('Route submitted successfully', 'success');
      clearRoute();
      setTimeout(() => router.replace('/'), 800);
    } else if (result.error === 'timeout') {
      showToast('Unable to submit. Retry?', 'error');
    } else if (result.error === 'backend unreachable') {
      showToast('Backend unreachable. Retry?', 'error');
    } else if (result.error) {
      // Validation errors (e.g. "All locations must be on same floor") are
      // reported verbatim so the user knows exactly why the route was rejected.
      showToast(result.error, 'warning');
    }
  };

  const editingEntry =
    editingIndex !== null ? routeCollection[editingIndex] ?? null : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <RoutePreviewList
          routeCollection={routeCollection}
          onEdit={handleEdit}
          onDelete={handleDeletePress}
        />

        <View style={{ height: spacing.componentSpacingVertical * 2 }} />

        <Button label="Cancel" onPress={handleCancel} variant="secondary" />
        <View style={{ height: spacing.componentSpacingVertical }} />
        <Button
          label="Submit Route"
          onPress={handleSubmit}
          variant="primary"
          loading={submitting}
          disabled={routeCollection.length < 2 || submitting}
        />
      </ScrollView>

      {editingEntry && (
        <EditRouteModal
          visible={editingIndex !== null}
          entry={editingEntry}
          isFirst={editingEntry.order === 1}
          rooms={rooms}
          onSave={(changes) => {
            if (editingIndex === null) return;
            try {
              const error = updateRoute(editingIndex, changes);
              if (error) {
                showToast(error, 'warning');
                return;
              }
              setEditingIndex(null);
              showToast('Route entry updated', 'success');
            } catch (err) {
              showToast(err instanceof Error ? err.message : 'Invalid entry', 'warning');
            }
          }}
          onCancel={() => setEditingIndex(null)}
        />
      )}

      <ConfirmDialog
        visible={deletingIndex !== null}
        title="Remove from route?"
        message={
          deletingIndex !== null
            ? `Remove ${routeCollection[deletingIndex]?.room_name ?? 'location'} from route?`
            : ''
        }
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingIndex(null)}
      />

      <Toast toast={toast} />
    </SafeAreaView>
  );
}

interface EditRouteModalProps {
  visible: boolean;
  entry: RouteEntry;
  isFirst: boolean;
  rooms: Room[];
  onSave: (changes: {
    steps?: number;
    direction?: Direction | null;
    room_id?: string;
    room_name?: string;
  }) => void;
  onCancel: () => void;
}

function EditRouteModal({ visible, entry, isFirst, rooms, onSave, onCancel }: EditRouteModalProps) {
  const themeColors = useThemeColors();
  const styles = getStyles(themeColors);

  const [room, setRoom] = useState(rooms.find((r) => r.id === entry.room_id) ?? null);
  const [stepsText, setStepsText] = useState(
    entry.steps_from_previous !== null ? String(entry.steps_from_previous) : ''
  );
  const [direction, setDirection] = useState<Direction | null>(entry.direction);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    setRoom(rooms.find((r) => r.id === entry.room_id) ?? null);
    setStepsText(entry.steps_from_previous !== null ? String(entry.steps_from_previous) : '');
    setDirection(entry.direction);
    setErrorText(null);
  }, [entry, rooms]);

  const handleSave = () => {
    const changes: {
      steps?: number;
      direction?: Direction | null;
      room_id?: string;
      room_name?: string;
    } = {};

    if (room) {
      changes.room_id = room.id;
      changes.room_name = room.name;
    }

    if (!isFirst) {
      const steps = stepsText.trim() === '' ? null : Number(stepsText);
      if (steps === null || !Number.isInteger(steps) || steps <= 0 || steps > MAX_ROUTE_STEPS) {
        setErrorText('Steps must be a positive integer (max 9999)');
        return;
      }
      if (!direction) {
        setErrorText('Please select a direction');
        return;
      }
      changes.steps = steps;
      changes.direction = direction;
    }

    setErrorText(null);
    onSave(changes);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Edit {entry.room_name}</Text>

          <RoomSelector rooms={rooms} selectedRoom={room} onSelect={setRoom} />

          <View style={{ height: spacing.componentSpacingVertical * 2 }} />

          <Text style={styles.label}>Steps from previous:</Text>
          <TextInput
            style={styles.input}
            value={stepsText}
            onChangeText={setStepsText}
            placeholder="e.g., 42"
            placeholderTextColor={themeColors.onSurfaceVariant}
            keyboardType="number-pad"
            editable={!isFirst}
          />
          {isFirst ? (
            <Text style={styles.helperText}>Disabled — first location has no previous hop</Text>
          ) : null}

          <View style={{ height: spacing.componentSpacingVertical * 2 }} />

          <Text style={styles.label}>Direction traveled:</Text>
          <DirectionButtonGroup
            selectedDirection={direction}
            onSelect={setDirection}
            disabled={isFirst}
          />
          <View style={{ height: spacing.componentSpacingVertical }} />
          <DirectionDisplay direction={isFirst ? null : direction} />

          {errorText ? (
            <Text style={styles.errorText}>{errorText}</Text>
          ) : null}

          <View style={{ height: spacing.componentSpacingVertical * 2 }} />

          <View style={styles.modalActions}>
            <View style={{ flex: 1 }}>
              <Button label="Cancel" onPress={onCancel} variant="secondary" />
            </View>
            <View style={{ width: spacing.componentSpacingVertical }} />
            <View style={{ flex: 1 }}>
              <Button label="Save" onPress={handleSave} variant="primary" />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.screenPaddingHorizontal,
      paddingVertical: 16,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.surfaceContainerHigh,
      borderTopLeftRadius: spacing.shapeExtraLarge,
      borderTopRightRadius: spacing.shapeExtraLarge,
      padding: spacing.screenPaddingHorizontal + 4,
      paddingBottom: 32,
      maxHeight: '92%',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.onSurface,
      marginBottom: 16,
    },
    label: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.primary,
      marginBottom: 6,
      paddingLeft: 4,
    },
    input: {
      borderWidth: 1.5,
      borderColor: colors.outline,
      borderRadius: spacing.shapeSmall,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.surfaceContainerLow,
      minHeight: 52,
      fontSize: 16,
      color: colors.onSurface,
    },
    helperText: {
      marginTop: 6,
      fontSize: 12,
      color: colors.onSurfaceVariant,
      fontStyle: 'italic',
    },
    modalActions: {
      flexDirection: 'row',
    },
    errorText: {
      marginTop: 10,
      fontSize: 13,
      color: colors.error,
      fontWeight: '500',
    },
  });
