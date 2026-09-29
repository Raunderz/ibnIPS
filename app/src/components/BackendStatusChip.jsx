import { CloudOff, Loader2, Wifi } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { radius, spacing, typography, useTheme } from '../theme/index.js'

const STATES = {
  checking: { label: 'Checking', tone: 'textMuted', Icon: Loader2, spin: true },
  online: { label: 'Backend online', tone: 'success', Icon: Wifi, spin: false },
  offline: { label: 'Backend offline', tone: 'danger', Icon: CloudOff, spin: false },
  unconfigured: {
    label: 'No backend',
    tone: 'warning',
    Icon: CloudOff,
    spin: false,
  },
}

/**
 * Live reachability of the ibnIPS backend.
 *
 * Deliberately shows the raw base URL on tap, because "which backend am I
 * pointed at" is the first question when a phone build cannot reach the API.
 */
export function BackendStatusChip({ state, baseUrl, onPress }) {
  const theme = useTheme()
  const tokens = STATES[state] ?? STATES.checking
  const color = theme[tokens.tone]

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${tokens.label}. Backend address ${baseUrl}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: theme.surface,
          borderColor: pressed ? theme.borderStrong : theme.border,
        },
      ]}
    >
      <View style={styles.row}>
        <tokens.Icon size={13} color={color} strokeWidth={2.5} />
        <Text style={[typography.micro, { color }]} numberOfLines={1}>
          {tokens.label}
        </Text>
      </View>
      <Text
        style={[typography.micro, styles.url, { color: theme.textSubtle }]}
        numberOfLines={1}
      >
        {baseUrl.replace(/^https?:\/\//, '')}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    gap: 1,
    maxWidth: 220,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  url: {
    fontWeight: '400',
  },
})
