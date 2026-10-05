import { StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Server } from 'lucide-react-native'
import { haptics } from '../utils/haptics.js'
import { spacing, typography, useTheme } from '../theme/index.js'
import { BackendSettingsCard } from '../components/BackendSettingsCard.jsx'
import { Button } from '../components/Button.jsx'
import { SectionTitle } from '../components/Card.jsx'

/**
 * Public route: reachable before sign-in so the app can be pointed at a
 * different backend without having an account first.
 */
export default function ServerScreen() {
  const theme = useTheme()
  const router = useRouter()

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.background }]}
      edges={['top', 'bottom']}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[typography.title, { color: theme.text }]}>Backend</Text>
          <Text style={[typography.caption, { color: theme.textMuted }]}>
            Where ibnIPS looks for the campus map and sessions
          </Text>
        </View>
        <View style={[styles.mark, { backgroundColor: theme.primary }]}>
          <Server size={18} color={theme.onPrimary} />
        </View>
      </View>

      <View style={styles.content}>
        <View>
          <SectionTitle>Address</SectionTitle>
          <BackendSettingsCard showAddress />
        </View>

        <Text style={[typography.caption, styles.note, { color: theme.textSubtle }]}>
          Changing the address signs out of nothing and clears cached campus data,
          so the next screen reloads from the new backend.
        </Text>

        <Button
          label="Done"
          variant="secondary"
          onPress={() => {
            haptics.light()
            router.back()
          }}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  mark: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  note: {
    lineHeight: 18,
  },
})
