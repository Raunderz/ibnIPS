// ICPS/components/RoomSelector.tsx

import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useThemeColors, ThemeColors } from '../utils/colors';
import { spacing } from '../utils/spacing';
import { Room } from '../types';

interface RoomSelectorProps {
  rooms: Room[];
  selectedRoom: Room | null;
  onSelect: (room: Room) => void;
}

export default function RoomSelector({ rooms, selectedRoom, onSelect }: RoomSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const themeColors = useThemeColors();
  const styles = getStyles(themeColors);

  const filteredRooms = useMemo(() => {
    const sorted = [...rooms].sort((a, b) => a.name.localeCompare(b.name));
    if (!query.trim()) return sorted;
    return sorted.filter((r) => r.name.toLowerCase().includes(query.toLowerCase()));
  }, [rooms, query]);

  const handleSelect = (room: Room) => {
    onSelect(room);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <View>
      <Text style={styles.label}>Select Room:</Text>
      <Pressable
        onPress={() => setIsOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={selectedRoom ? `Selected room: ${selectedRoom.name}` : 'Choose a room'}
        style={styles.field}
      >
        <Text style={selectedRoom ? styles.fieldText : styles.fieldPlaceholder}>
          {selectedRoom ? selectedRoom.name : 'Choose a room...'}
        </Text>
        <Text style={styles.caret}>▼</Text>
      </Pressable>

      <Modal visible={isOpen} animationType="slide" onRequestClose={() => setIsOpen(false)}>
        <View style={styles.modalContainer}>
          <TextInput
            placeholder="Search rooms..."
            placeholderTextColor={themeColors.onSurfaceVariant}
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
            autoFocus
          />
          <FlatList
            data={filteredRooms}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleSelect(item)}
                accessibilityRole="button"
                style={styles.roomRow}
              >
                <Text style={styles.roomText}>{item.name}</Text>
                {selectedRoom?.id === item.id ? <Text style={styles.check}>✓</Text> : null}
              </Pressable>
            )}
          />
          <Pressable onPress={() => setIsOpen(false)} style={styles.closeButton}>
            <Text style={styles.closeText}>Cancel</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.primary, // MD3 color role
    marginBottom: 6,
    paddingLeft: 4,
  },
  field: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.outline,
    borderRadius: spacing.shapeSmall, // MD3 Text Field border radius (4dp)
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surfaceContainerLow,
    minHeight: 52,
  },
  fieldText: { fontSize: 16, color: colors.onSurface },
  fieldPlaceholder: { fontSize: 16, color: colors.onSurfaceVariant },
  caret: { color: colors.onSurfaceVariant },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.screenPaddingHorizontal,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: spacing.shapeFull, // MD3 Search Bar fully rounded style
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 16,
    backgroundColor: colors.surfaceContainerHigh,
    fontSize: 16,
    color: colors.onSurface,
  },
  roomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    minHeight: 56, // MD3 list item height spec
    alignItems: 'center',
  },
  roomText: { fontSize: 16, color: colors.onSurface },
  check: { color: colors.primary, fontWeight: '700', fontSize: 18 },
  closeButton: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: spacing.shapeFull,
    marginTop: 8,
  },
  closeText: { color: colors.primary, fontSize: 16, fontWeight: '600' },
});