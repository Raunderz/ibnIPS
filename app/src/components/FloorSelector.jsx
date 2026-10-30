import { Pressable, ScrollView, StyleSheet, Text } from 'react-native'
import { radius, spacing, typography, useTheme } from '../theme/index.js'
import { haptics } from '../utils/haptics.js'

export function FloorSelector({ floors, selected, onSelect }) {
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
              F{floor}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  pill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    minWidth: 34,
  },
})
