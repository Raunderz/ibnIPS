import { ChevronRight } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { radius, spacing, typography, useTheme } from '../theme/index.js'
import { getFloorLabel } from '../utils/location.js'
import { haptics } from '../utils/haptics.js'

export function NodeRow({ node, selected, onPress, meta }) {
  const theme = useTheme()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      onPress={() => {
        haptics.selection()
        onPress?.(node)
      }}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: selected
            ? theme.primarySoft
            : pressed
              ? theme.surfaceMuted
              : 'transparent',
        },
      ]}
    >
      <View style={styles.text}>
        <Text
          numberOfLines={1}
          style={[typography.bodyStrong, { color: theme.text }]}
        >
          {node.name}
        </Text>
        <Text
          numberOfLines={1}
          style={[typography.caption, { color: theme.textMuted }]}
        >
          {meta ?? getFloorLabel(node.floor)}
        </Text>
      </View>

      <ChevronRight size={18} color={theme.textSubtle} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  text: {
    flex: 1,
    gap: 2,
  },
})
