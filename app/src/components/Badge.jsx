import { StyleSheet, Text, View } from 'react-native'
import { radius, spacing, typography, useTheme } from '../theme/index.js'

const TONES = {
  neutral: { background: 'surfaceMuted', text: 'textMuted' },
  primary: { background: 'primarySoft', text: 'primary' },
  success: { background: 'successSoft', text: 'success' },
  warning: { background: 'warningSoft', text: 'warning' },
  danger: { background: 'dangerSoft', text: 'danger' },
  accent: { background: 'accentSoft', text: 'accent' },
}

export function Badge({ label, tone = 'neutral', icon: Icon, style }) {
  const theme = useTheme()
  const tokens = TONES[tone] ?? TONES.neutral

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: theme[tokens.background] },
        style,
      ]}
    >
      {Icon ? <Icon size={12} color={theme[tokens.text]} strokeWidth={2.5} /> : null}
      <Text style={[typography.micro, { color: theme[tokens.text] }]}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
})
