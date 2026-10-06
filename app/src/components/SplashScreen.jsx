import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { Navigation } from 'lucide-react-native'
import { radius, spacing, typography, useTheme } from '../theme/index.js'

export function SplashScreen({ message = 'Starting ibnIPS' }) {
  const theme = useTheme()

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.mark, { backgroundColor: theme.primary }]}>
        <Navigation size={26} color={theme.onPrimary} strokeWidth={2.5} />
      </View>
      <Text style={[typography.title, styles.title, { color: theme.text }]}>
        ibnIPS
      </Text>
      <Text style={[typography.caption, { color: theme.textMuted }]}>
        I Better Navigate
      </Text>
      <ActivityIndicator style={styles.spinner} color={theme.textSubtle} />
      <Text style={[typography.micro, styles.hint, { color: theme.textSubtle }]}>
        {message}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  mark: {
    width: 60,
    height: 60,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    letterSpacing: -0.5,
  },
  spinner: {
    marginTop: spacing.lg,
  },
  hint: {
    textTransform: 'uppercase',
  },
})
