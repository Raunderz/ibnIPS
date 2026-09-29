import { StyleSheet, Text, View } from 'react-native'
import { radius, spacing, typography, useTheme } from '../theme/index.js'

export function Card({ children, style, padded = true }) {
  const theme = useTheme()

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          padding: padded ? spacing.lg : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}

export function SectionTitle({ children, action }) {
  const theme = useTheme()

  return (
    <View style={styles.sectionTitle}>
      <Text
        style={[
          typography.micro,
          { color: theme.textSubtle, textTransform: 'uppercase' },
        ]}
      >
        {children}
      </Text>
      {action ?? null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
})
