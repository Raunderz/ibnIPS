import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Database,
  Info,
  LogOut,
  ShieldCheck,
  Smartphone,
} from 'lucide-react-native'
import { useAuthSession } from '../../hooks/useAuthSession.js'
import { useRecentDestinations } from '../../hooks/useRecentDestinations.js'
import { usePosition } from '../../positioning/PositionProvider.jsx'
import { formatExpiry, getLocationCountLabel, getUserInitials } from '../../utils/location.js'
import { haptics } from '../../utils/haptics.js'
import { radius, spacing, typography, useTheme } from '../../theme/index.js'
import { BackendSettingsCard } from '../../components/BackendSettingsCard.jsx'
import { Badge } from '../../components/Badge.jsx'
import { Button } from '../../components/Button.jsx'
import { Card, SectionTitle } from '../../components/Card.jsx'
import { EmptyState } from '../../components/EmptyState.jsx'

const CAPABILITY_COPY = {
  full: 'Full surrounding-network scan is available. ibnIPS can detect your room automatically.',
  'current-only':
    'iOS only reveals the Wi-Fi network you are joined to, so automatic room detection is unavailable. Pick your room manually.',
  unavailable:
    'This platform exposes no Wi-Fi scanning API to apps, so automatic room detection is unavailable. Use the campus map instead.',
}

export default function AccountScreen() {
  const theme = useTheme()
  const router = useRouter()
  const { session, signOut } = useAuthSession()
  const recents = useRecentDestinations()
  const position = usePosition()

  const nodes = position.catalog?.nodes ?? []

  const confirmSignOut = () => {
    Alert.alert(
      'Sign out?',
      'The backend keeps your session valid until it expires in 24 hours. Signing out here only removes the token from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: () => {
            haptics.warning()
            signOut('signed-out')
            router.replace('/login')
          },
        },
      ],
    )
  }

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.background }]}
      edges={['top']}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[typography.title, { color: theme.text }]}>Account</Text>

        <Card>
          <View style={styles.identity}>
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              <Text style={[typography.title, { color: theme.onPrimary }]}>
                {getUserInitials(session?.userId)}
              </Text>
            </View>
            <View style={styles.identityText}>
              <Text style={[typography.heading, { color: theme.text }]}>
                {session?.userId ?? 'Not signed in'}
              </Text>
              <Text style={[typography.caption, { color: theme.textMuted }]}>
                Session expires {formatExpiry(session?.expiresAt)}
              </Text>
            </View>
          </View>
        </Card>

        <View>
          <SectionTitle>Backend</SectionTitle>
          <BackendSettingsCard />
        </View>

        <View>
          <SectionTitle>This device</SectionTitle>
          <Card style={styles.stack}>
            <View style={styles.row}>
              <Smartphone size={17} color={theme.textSubtle} />
              <Text style={[typography.body, styles.rowText, { color: theme.text }]}>
                {Platform.OS === 'android'
                  ? 'Android'
                  : Platform.OS === 'ios'
                    ? 'iOS'
                    : Platform.OS === 'web'
                      ? 'Web browser'
                      : Platform.OS}
              </Text>
              <Badge
                label={
                  position.capability === 'full'
                    ? 'Wi-Fi scan'
                    : position.capability === 'current-only'
                      ? 'Limited'
                      : 'No scan'
                }
                tone={
                  position.capability === 'full'
                    ? 'success'
                    : position.capability === 'current-only'
                      ? 'warning'
                      : 'danger'
                }
              />
            </View>
            <Text style={[typography.caption, styles.paragraph, { color: theme.textMuted }]}>
              {CAPABILITY_COPY[position.capability]}
            </Text>
          </Card>
        </View>

        <View>
          <SectionTitle>Campus data</SectionTitle>
          <Card style={styles.stack}>
            <View style={styles.row}>
              <Database size={17} color={theme.textSubtle} />
              <Text style={[typography.body, styles.rowText, { color: theme.text }]}>
                {getLocationCountLabel(nodes.length)}
              </Text>
              {position.hasFingerprintData ? (
                <Badge
                  label={`${Object.keys(position.catalog?.fingerprints ?? {}).length} fingerprinted`}
                  tone="accent"
                />
              ) : (
                <Badge label="No fingerprints" tone="warning" />
              )}
            </View>

            {recents.items.length > 0 ? (
              <Button
                label={`Clear ${recents.items.length} recent room${
                  recents.items.length === 1 ? '' : 's'
                }`}
                variant="ghost"
                size="sm"
                onPress={() => {
                  haptics.light()
                  recents.clear()
                }}
              />
            ) : null}
          </Card>
        </View>

        <Button
          label="Sign out"
          icon={LogOut}
          variant="danger"
          size="lg"
          onPress={confirmSignOut}
        />

        <View style={styles.about}>
          <Info size={14} color={theme.textSubtle} />
          <Text style={[typography.caption, styles.aboutText, { color: theme.textSubtle }]}>
            ibnIPS · indoor positioning over ambient Wi-Fi. The backend exposes no
            sign-out endpoint, so a token stays valid for 24 hours after sign-in.
          </Text>
        </View>

        {!position.isSupported ? (
          <Card>
            <EmptyState
              icon={ShieldCheck}
              tone="warning"
              title="Positioning needs a dev build"
              message="Wi-Fi scanning uses native Android code, so it only runs in a development build or an EAS build, not in Expo Go."
            />
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityText: {
    flex: 1,
    gap: 2,
  },
  stack: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowText: {
    flex: 1,
  },
  paragraph: {
    lineHeight: 19,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flexAction: {
    flex: 1,
  },
  about: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  aboutText: {
    flex: 1,
    lineHeight: 18,
  },
})
