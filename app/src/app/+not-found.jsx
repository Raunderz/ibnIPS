import { StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Compass } from 'lucide-react-native'
import { spacing, typography, useTheme } from '../theme/index.js'
import { Button } from '../components/Button.jsx'
import { EmptyState } from '../components/EmptyState.jsx'

export default function NotFoundScreen() {
  const theme = useTheme()
  const router = useRouter()

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.background }]}
      edges={['top', 'bottom']}
    >
      <View style={styles.centered}>
        <EmptyState
          icon={Compass}
          title="Page not found"
          message="That screen does not exist in ibnIPS."
          action={
            <Button label="Back to home" onPress={() => router.replace('/')} />
          }
        />
        <Text style={[typography.caption, { color: theme.textSubtle }]}>
          ibnIPS · I Better Navigate
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.xl,
  },
})
