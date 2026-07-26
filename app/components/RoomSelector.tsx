// ICPS/components/RoomSelector.tsx

import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../utils/colors';
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

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  field: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.borderRadiusStandard,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.card,
    minHeight: 48,
  },
  fieldText: { fontSize: 16, color: colors.textPrimary },
  fieldPlaceholder: { fontSize: 16, color: colors.textSecondary },
  caret: { color: colors.textSecondary },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.screenPaddingHorizontal,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.borderRadiusStandard,
    padding: 12,
    marginBottom: 12,
    backgroundColor: colors.card,
  },
  roomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 48,
    alignItems: 'center',
  },
  roomText: { fontSize: 16, color: colors.textPrimary },
  check: { color: colors.primary, fontWeight: '700' },
  closeButton: { padding: 16, alignItems: 'center' },
  closeText: { color: colors.textSecondary, fontSize: 16 },
});