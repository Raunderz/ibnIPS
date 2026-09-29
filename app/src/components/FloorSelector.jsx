import { Pressable, ScrollView, StyleSheet, Text } from 'react-native'
import { radius, spacing, typography, useTheme } from '../theme/index.js'
import { haptics } from '../utils/haptics.js'

export function FloorSelector({ floors, counts, selected, onSelect }) {
  const theme = useTheme()

  if (floors.length <= 1) {
    return null
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {floors.map((floor) => {
        const isSelected = floor === selected

        return (
          <Pressable
            key={floor}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            onPress={() => {
              haptics.selection()
              onSelect(floor)
            }}
            style={({ pressed }) => [
              styles.pill,
              {
                backgroundColor: isSelected
                  ? theme.primary
                  : pressed
                    ? theme.surfaceMuted
                    : theme.surface,
                borderColor: isSelected ? theme.primary : theme.border,
              },
            ]}
          >
            <Text
              style={[
                typography.caption,
                { color: isSelected ? theme.onPrimary : theme.textMuted },
              ]}
            >
              Floor {floor}
            </Text>
            <Text
              style={[
                typography.micro,
                {
                  color: isSelected ? theme.onPrimary : theme.textSubtle,
                  opacity: isSelected ? 0.85 : 1,
                },
              ]}
            >
              {counts.get(floor) ?? 0}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
})
