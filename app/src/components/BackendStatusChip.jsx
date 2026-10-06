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
 * Only the connection state is shown. The backend address is deliberately never
 * rendered: it is an implementation detail of the build, and end users have no
 * way to act on it. It stays editable on the Account screen for whoever is
 * debugging a build.
 */
export function BackendStatusChip({ state, onPress }) {
  const theme = useTheme()
  const tokens = STATES[state] ?? STATES.checking
  const color = theme[tokens.tone]

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tokens.label}
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
    </Pressable>
  )
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    gap: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
})
