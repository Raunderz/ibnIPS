import { useMemo } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Building2,
  ChevronRight,
  History,
  LocateFixed,
  MapPin,
  Navigation,
  Radar,
  Search,
  TriangleAlert,
  WifiOff,
} from 'lucide-react-native'
import { useAuthSession } from '../../hooks/useAuthSession.js'
import { useBackendStatus } from '../../hooks/useBackendStatus.js'
import { useRecentDestinations } from '../../hooks/useRecentDestinations.js'
import { usePosition } from '../../positioning/PositionProvider.jsx'
import { getFloors } from '../../map/mapGraph.js'
import {
  getFloorLabel,
  getLocationCountLabel,
  getUserInitials,
} from '../../utils/location.js'
import { haptics } from '../../utils/haptics.js'
import { radius, spacing, typography, useTheme } from '../../theme/index.js'
import { Badge } from '../../components/Badge.jsx'
import { BackendStatusChip } from '../../components/BackendStatusChip.jsx'
import { Button } from '../../components/Button.jsx'
import { Card, SectionTitle } from '../../components/Card.jsx'
import { EmptyState } from '../../components/EmptyState.jsx'

const CONFIDENCE_TONE = {
  high: 'success',
  medium: 'warning',
  low: 'danger',
  manual: 'primary',
}

/** Stable identity, so memos downstream are not invalidated while loading. */
const EMPTY_NODES = []

function getGreeting() {
  const hour = new Date().getHours()

  if (hour < 12) {
    return 'Good morning'
  }

  if (hour < 17) {
    return 'Good afternoon'
  }

  return 'Good evening'
}

export default function HomeScreen() {
  const theme = useTheme()
  const router = useRouter()
  const { session } = useAuthSession()
  const backend = useBackendStatus()
  const recents = useRecentDestinations()
  const position = usePosition()

  const catalog = position.catalog
  const nodes = catalog?.nodes ?? EMPTY_NODES
  const floors = useMemo(() => getFloors(nodes), [nodes])

  const fingerprintNodeCount = Object.keys(catalog?.fingerprints ?? {}).length

  const refreshAll = async () => {
    haptics.selection()
    await backend.refetch()
  }

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.background }]}
      edges={['top']}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={backend.isRefetching}
            onRefresh={refreshAll}
            tintColor={theme.textSubtle}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={[typography.caption, { color: theme.textMuted }]}>
              {getGreeting()}
            </Text>
            <Text style={[typography.title, { color: theme.text }]} numberOfLines={1}>
              {session?.userId ?? 'Guest'}
            </Text>
          </View>

          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <Text style={[typography.bodyStrong, { color: theme.onPrimary }]}>
              {getUserInitials(session?.userId)}
            </Text>
          </View>
        </View>

        <BackendStatusChip
          state={backend.state}
          onPress={() => router.push('/account')}
        />

        <Card>
          <View style={styles.cardHeader}>
            <SectionTitle>Where am I</SectionTitle>
            {position.isManual ? (
              <Badge label="Set manually" tone="primary" />
            ) : position.confidenceLabel ? (
              <Badge
                label={`${position.confidenceLabel} ${position.confidence}%`}
                tone={CONFIDENCE_TONE[position.confidenceLabel] ?? 'neutral'}
              />
            ) : null}
          </View>

          {position.isLocating ? (
            <View style={styles.locateRow}>
              <Radar size={22} color={theme.primary} />
              <Text style={[typography.body, styles.locateText, { color: theme.text }]}>
                Scanning nearby Wi-Fi networks
              </Text>
            </View>
          ) : position.positionNode ? (
            <Pressable
              onPress={() => router.push('/map')}
              style={({ pressed }) => [
                styles.positionBlock,
                { backgroundColor: pressed ? theme.surfaceMuted : theme.surfaceMuted },
              ]}
            >
              <MapPin size={20} color={theme.accent} />
              <View style={styles.positionText}>
                <Text
                  style={[typography.heading, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {position.positionNode.name}
                </Text>
                <Text style={[typography.caption, { color: theme.textMuted }]}>
                  {getFloorLabel(position.positionNode.floor)}
                  {position.alternatives.length > 0
                    ? ` · ${position.alternatives.length} nearby candidate${
                        position.alternatives.length === 1 ? '' : 's'
                      }`
                    : ''}
                </Text>
              </View>
              <ChevronRight size={18} color={theme.textSubtle} />
            </Pressable>
          ) : (
            <View style={styles.locateColumn}>
              <Text style={[typography.body, styles.explain, { color: theme.textMuted }]}>
                {position.isSupported
                  ? 'Scan the Wi-Fi networks around you to work out which room you are in.'
                  : position.capability === 'current-only'
                    ? 'iOS does not allow apps to list nearby Wi-Fi networks, so ibnIPS cannot detect your room on this device.'
                    : 'Wi-Fi scanning needs a physical Android device. On the web you can still browse the map and plan routes.'}
              </Text>

              {position.error ? (
                <View style={styles.inlineError}>
                  <TriangleAlert size={15} color={theme.danger} />
                  <Text
                    style={[typography.caption, styles.inlineErrorText, { color: theme.danger }]}
                  >
                    {position.error}
                  </Text>
                </View>
              ) : null}

              {position.isSupported ? (
                <Button
                  label="Scan for my location"
                  icon={LocateFixed}
                  disabled={!position.canRescan}
                  loading={position.isLocating}
                  onPress={() => {
                    haptics.medium()
                    void position.scan()
                  }}
                />
              ) : (
                <Button
                  label="Choose my room on the map"
                  icon={MapPin}
                  variant="secondary"
                  onPress={() => router.push('/map')}
                />
              )}
            </View>
          )}
        </Card>

        <View style={styles.statsRow}>
          <StatTile
            icon={Building2}
            value={nodes.length}
            label={getLocationCountLabel(nodes.length)}
          />
          <StatTile icon={Radar} value={floors.length} label={`Floor${floors.length === 1 ? '' : 's'}`} />
          <StatTile
            icon={WifiOff}
            value={fingerprintNodeCount}
            label="Fingerprinted"
          />
        </View>

        <View style={styles.actions}>
          <ActionTile
            icon={Search}
            title="Find a room"
            subtitle="Search the campus"
            onPress={() => router.push('/search?purpose=destination')}
          />
          <ActionTile
            icon={Navigation}
            title="Navigate"
            subtitle="Step-by-step route"
            onPress={() => router.push('/navigate')}
          />
        </View>

        {recents.items.length > 0 ? (
          <View>
            <SectionTitle>Recent rooms</SectionTitle>
            <Card padded={false}>
              {recents.items.map((node, index) => (
                <Pressable
                  key={node.nodeId}
                  onPress={() => {
                    haptics.selection()
                    recents.record(node)
                    router.push(`/navigate?to=${node.nodeId}`)
                  }}
                  style={({ pressed }) => [
                    styles.recentRow,
                    {
                      borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth * 2,
                      borderTopColor: theme.border,
                      backgroundColor: pressed ? theme.surfaceMuted : 'transparent',
                    },
                  ]}
                >
                  <History size={16} color={theme.textSubtle} />
                  <View style={styles.recentText}>
                    <Text
                      style={[typography.bodyStrong, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {node.name}
                    </Text>
                    <Text style={[typography.caption, { color: theme.textMuted }]}>
                      {getFloorLabel(node.floor)}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={theme.textSubtle} />
                </Pressable>
              ))}
            </Card>
          </View>
        ) : null}

        {backend.state === 'offline' ? (
          <Card>
            <EmptyState
              icon={TriangleAlert}
              tone="danger"
              title="Cannot reach the backend"
              message="The ibnIPS server could not be reached. Check your connection, then try again."
              action={
                <Button
                  label="Try again"
                  variant="secondary"
                  onPress={() => {
                    void backend.refetch()
                  }}
                />
              }
            />
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

function StatTile({ icon: Icon, value, label }) {
  const theme = useTheme()

  return (
    <View style={[styles.statTile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Icon size={16} color={theme.textSubtle} />
      <Text style={[typography.title, { color: theme.text }]}>{value}</Text>
      <Text style={[typography.micro, { color: theme.textSubtle }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

function ActionTile({ icon: Icon, title, subtitle, onPress }) {
  const theme = useTheme()

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptics.light()
        onPress()
      }}
      style={({ pressed }) => [
        styles.actionTile,
        {
          backgroundColor: pressed ? theme.primarySoft : theme.surface,
          borderColor: pressed ? theme.primary : theme.border,
        },
      ]}
    >
      <Icon size={20} color={theme.primary} />
      <View style={styles.actionText}>
        <Text style={[typography.bodyStrong, { color: theme.text }]}>{title}</Text>
        <Text style={[typography.caption, { color: theme.textMuted }]}>{subtitle}</Text>
      </View>
    </Pressable>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  locateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  locateText: {
    flex: 1,
  },
  locateColumn: {
    gap: spacing.md,
  },
  explain: {
    lineHeight: 21,
  },
  inlineError: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  inlineErrorText: {
    flex: 1,
    lineHeight: 18,
  },
  positionBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  positionText: {
    flex: 1,
    gap: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statTile: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  actions: {
    gap: spacing.sm,
  },
  actionTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  actionText: {
    flex: 1,
    gap: 2,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  recentText: {
    flex: 1,
    gap: 2,
  },
})
