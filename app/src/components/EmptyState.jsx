import { StyleSheet, Text, View } from 'react-native'
import { radius, spacing, typography, useTheme } from '../theme/index.js'

export function EmptyState({ icon: Icon, title, message, action, tone = 'neutral' }) {
  const theme = useTheme()
  const accent =
    tone === 'danger' ? theme.danger : tone === 'warning' ? theme.warning : theme.primary

  return (
    <View style={styles.root}>
      {Icon ? (
        <View style={[styles.icon, { backgroundColor: theme.surfaceMuted }]}>
          <Icon size={26} color={accent} />
        </View>
      ) : null}

      <Text style={[typography.heading, styles.title, { color: theme.text }]}>
        {title}
      </Text>

      {message ? (
        <Text style={[typography.body, styles.message, { color: theme.textMuted }]}>
          {message}
        </Text>
      ) : null}

      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  )
}

export function Divider({ style }) {
  const theme = useTheme()

  return (
    <View
      style={[
        styles.divider,
        { backgroundColor: theme.border },
        style,
      ]}
    />
  )
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    lineHeight: 21,
  },
  action: {
    marginTop: spacing.md,
    alignSelf: 'stretch',
  },
  divider: {
    height: StyleSheet.hairlineWidth * 2,
  },
})
