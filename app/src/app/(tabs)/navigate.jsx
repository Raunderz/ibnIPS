import { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  ArrowRight,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Flag,
  LocateFixed,
  MapPin,
  Navigation,
  Search,
  Square,
} from 'lucide-react-native'
import { usePosition } from '../../positioning/PositionProvider.jsx'
import { createNavigationService } from '../../services/navigation.js'
import { useRecentDestinations } from '../../hooks/useRecentDestinations.js'
import { getFloorEdges, getFloorNodes } from '../../map/mapGraph.js'
import {
  getFloorLabel,
  getLocationTitle,
} from '../../utils/location.js'
import { haptics } from '../../utils/haptics.js'
import { radius, spacing, typography, useTheme } from '../../theme/index.js'
import { Badge } from '../../components/Badge.jsx'
import { Button } from '../../components/Button.jsx'
import { CampusMap } from '../../components/CampusMap.jsx'
import { Card, SectionTitle } from '../../components/Card.jsx'
import { EmptyState } from '../../components/EmptyState.jsx'

const CONFIDENCE_TONE = {
  high: 'success',
  medium: 'warning',
  low: 'danger',
  manual: 'primary',
}

/** Stable identities, so nothing downstream churns while the map is loading. */
const EMPTY_NODES = []
const EMPTY_EDGES = []
const EMPTY_SEGMENTS = []

export default function NavigateScreen() {
  const theme = useTheme()
  const router = useRouter()
  const params = useLocalSearchParams()
  const position = usePosition()
  const { record: recordDestination } = useRecentDestinations()

  const catalog = position.catalog
  const nodes = catalog?.nodes ?? EMPTY_NODES
  const edges = catalog?.edges ?? EMPTY_EDGES

  const service = createNavigationService(nodes, edges)

  const paramSource = typeof params.from === 'string' ? params.from : null
  const paramDestination = typeof params.to === 'string' ? params.to : null

  const [sourceId, setSourceId] = useState(paramSource)
  const [destinationId, setDestinationId] = useState(paramDestination)
  const [segmentIndex, setSegmentIndex] = useState(0)
  const [isNavigating, setIsNavigating] = useState(false)
  const [syncedParams, setSyncedParams] = useState({ paramSource, paramDestination })

  // Search hands the choice back through the URL, so mirror param changes into
  // state during render rather than in an effect that would cause a second
  // render pass.
  if (syncedParams.paramSource !== paramSource || syncedParams.paramDestination !== paramDestination) {
    setSyncedParams({ paramSource, paramDestination })
    setDestinationId(paramDestination)

    if (paramSource) {
      setSourceId(paramSource)
    }
  }

  // A scan that lands somewhere new should become the new starting point.
  if (!paramSource && position.positionNode) {
    const detected = position.positionNode.nodeId

    if (detected !== sourceId) {
      setSourceId(detected)
    }
  }

  // Changing either end of the journey invalidates any in-progress steps.
  const [activeRoute, setActiveRoute] = useState({ destinationId, sourceId })

  if (activeRoute.destinationId !== destinationId || activeRoute.sourceId !== sourceId) {
    setActiveRoute({ destinationId, sourceId })
    setSegmentIndex(0)
    setIsNavigating(false)
  }

  // The React Compiler already memoizes these, and hand memoizing them only
  // adds a dependency the compiler cannot prove stable.
  const route = service.calculateRoute(sourceId, destinationId)

  const isSamePlace = Boolean(sourceId && destinationId && sourceId === destinationId)

  const routeDetails =
    route && !isSamePlace ? service.getRouteDetails(route) : null

  const sourceNode = sourceId ? (service.nodesById.get(sourceId) ?? null) : null
  const destinationNode = destinationId
    ? (service.nodesById.get(destinationId) ?? null)
    : null

  useEffect(() => {
    if (destinationNode) {
      recordDestination(destinationNode)
    }
  }, [destinationNode, recordDestination])

  const segments = routeDetails?.segments ?? EMPTY_SEGMENTS
  const activeIndex = Math.min(segmentIndex, Math.max(segments.length - 1, 0))
  const activeSegment = segments[activeIndex] ?? null
  const progress =
    segments.length > 0
      ? Math.round(((activeIndex + 1) / segments.length) * 100)
      : 0

  const previewFloor = sourceNode?.floor ?? routeDetails?.routeFloors?.[0] ?? null
  const previewPath = previewFloor ? (routeDetails?.pathsByFloor.get(previewFloor) ?? null) : null
  const previewNodes =
    previewFloor === null ? EMPTY_NODES : getFloorNodes(nodes, previewFloor)
  const previewEdges = getFloorEdges(
    edges,
    new Set(previewNodes.map((node) => node.nodeId)),
  )

  if (nodes.length === 0) {
    return (
      <SafeAreaView
        style={[styles.root, { backgroundColor: theme.background }]}
        edges={['top']}
      >
        <View style={styles.centered}>
          <EmptyState
            icon={Building2}
            title="Nothing to navigate yet"
            message="The backend has not published any campus locations, so there is no graph to route across."
            action={
              <Button
                label="Reload"
                variant="secondary"
                onPress={() => {
                  void position.refetchCatalog()
                }}
              />
            }
          />
        </View>
      </SafeAreaView>
    )
  }

  const startNavigation = () => {
    haptics.success()
    setSegmentIndex(0)
    setIsNavigating(true)
  }

  const goNext = () => {
    haptics.light()

    if (activeIndex + 1 >= segments.length) {
      setIsNavigating(false)
      haptics.success()
      return
    }

    setSegmentIndex(activeIndex + 1)
  }

  const goBack = () => {
    haptics.light()
    setSegmentIndex((index) => Math.max(0, index - 1))
  }

  const stopNavigation = () => {
    haptics.warning()
    setIsNavigating(false)
    setSegmentIndex(0)
  }

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.background }]}
      edges={['top']}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={[typography.title, { color: theme.text }]}>Navigate</Text>
            <Text style={[typography.caption, { color: theme.textMuted }]}>
              {isNavigating
                ? `Step ${activeIndex + 1} of ${segments.length}`
                : 'Set a start and a destination'}
            </Text>
          </View>

          {position.positionNode && position.confidenceLabel ? (
            <Badge
              label={
                position.isManual
                  ? 'Manual'
                  : `${position.confidenceLabel} ${position.confidence}%`
              }
              tone={CONFIDENCE_TONE[position.confidenceLabel] ?? 'neutral'}
            />
          ) : null}
        </View>

        <Card>
          <View style={styles.endpoint}>
            <View style={[styles.endpointDot, { backgroundColor: theme.accent }]}>
              <Crosshair size={13} color={theme.onPrimary} />
            </View>
            <View style={styles.endpointText}>
              <Text style={[typography.micro, { color: theme.textSubtle }]}>
                START
              </Text>
              <Text
                style={[typography.bodyStrong, { color: theme.text }]}
                numberOfLines={1}
              >
                {sourceNode ? getLocationTitle(sourceNode) : 'Where are you?'}
              </Text>
            </View>
            <Button
              label={sourceNode ? 'Change' : 'Set'}
              size="sm"
              variant="ghost"
              onPress={() => {
                if (position.isSupported) {
                  haptics.medium()
                  void position.scan().then((node) => {
                    if (node) {
                      setSourceId(node.nodeId)
                    }
                  })
                } else {
                  router.push('/map')
                }
              }}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.endpoint}>
            <View style={[styles.endpointDot, { backgroundColor: theme.primary }]}>
              <Flag size={13} color={theme.onPrimary} />
            </View>
            <View style={styles.endpointText}>
              <Text style={[typography.micro, { color: theme.textSubtle }]}>
                DESTINATION
              </Text>
              <Text
                style={[typography.bodyStrong, { color: theme.text }]}
                numberOfLines={1}
              >
                {destinationNode
                  ? getLocationTitle(destinationNode)
                  : 'Where to?'}
              </Text>
            </View>
            <Button
              label={destinationNode ? 'Change' : 'Pick'}
              size="sm"
              variant="ghost"
              icon={Search}
              onPress={() =>
                router.push(
                  sourceId
                    ? `/search?purpose=destination&from=${sourceId}`
                    : '/search?purpose=destination',
                )
              }
            />
          </View>
        </Card>

        {isNavigating && activeSegment ? (
          <Card style={styles.activeCard}>
            <View style={styles.activeHeader}>
              <Badge
                label={`Step ${activeIndex + 1} of ${segments.length}`}
                tone="primary"
              />
              <Text style={[typography.caption, { color: theme.textMuted }]}>
                {activeSegment.steps} steps
              </Text>
            </View>

            <Text style={[typography.title, styles.instruction, { color: theme.text }]}>
              {activeSegment.instruction}
            </Text>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: theme.primary, width: `${progress}%` },
                ]}
              />
            </View>

            <View style={styles.controls}>
              <Button
                label="Back"
                icon={ChevronLeft}
                variant="secondary"
                size="sm"
                disabled={activeIndex === 0}
                onPress={goBack}
                style={styles.control}
              />
              <Button
                label={activeIndex + 1 >= segments.length ? 'Arrive' : 'Next'}
                icon={activeIndex + 1 >= segments.length ? Check : ChevronRight}
                size="sm"
                onPress={goNext}
                style={styles.controlWide}
              />
              <Button
                label="Stop"
                icon={Square}
                variant="ghost"
                size="sm"
                onPress={stopNavigation}
                style={styles.control}
              />
            </View>
          </Card>
        ) : null}

        {routeDetails && previewNodes.length > 0 ? (
          <View style={styles.previewWrap}>
            <View style={styles.preview}>
              <CampusMap
                nodes={previewNodes}
                edges={previewEdges}
                routePath={previewPath}
                sourceNodeId={sourceId}
                destinationNodeId={destinationId}
                positionNodeId={position.positionNode?.nodeId ?? null}
                viewKey={`preview-${previewFloor}-${destinationId}`}
              />
            </View>
            <View style={styles.previewSummary}>
              <Text style={[typography.caption, { color: theme.textMuted }]}>
                {routeDetails.totalSteps} steps · {segments.length} segments ·{' '}
                {routeDetails.routeFloors.map((floor) => `Floor ${floor}`).join(', ')}
              </Text>
            </View>
          </View>
        ) : null}

        {!isSamePlace && route && !routeDetails ? (
          <Card>
            <EmptyState
              icon={MapPin}
              tone="warning"
              title="No path between these rooms"
              message="The campus graph has no connected route between your start point and destination."
              action={
                <Button
                  label="Pick another destination"
                  variant="secondary"
                  onPress={() =>
                    router.push(
                      sourceId
                        ? `/search?purpose=destination&from=${sourceId}`
                        : '/search?purpose=destination',
                    )
                  }
                />
              }
            />
          </Card>
        ) : null}

        {isSamePlace ? (
          <Card>
            <EmptyState
              icon={Check}
              title="You are already there"
              message={`You do not need to walk anywhere to reach ${
                destinationNode ? getLocationTitle(destinationNode) : 'this room'
              }.`}
              action={
                <Button
                  label="Choose a different room"
                  icon={Search}
                  onPress={() =>
                    router.push(
                      sourceId
                        ? `/search?purpose=destination&from=${sourceId}`
                        : '/search?purpose=destination',
                    )
                  }
                />
              }
            />
          </Card>
        ) : null}

        {routeDetails ? (
          <View>
            <SectionTitle>Steps</SectionTitle>
            <Card padded={false}>
              {segments.map((segment, index) => {
                const isActive = isNavigating && index === activeIndex
                const isDone = isNavigating && index < activeIndex

                return (
                  <Pressable
                    key={`${segment.fromNodeId}-${segment.toNodeId}-${index}`}
                    onPress={() => {
                      haptics.selection()
                      setSegmentIndex(index)
                      setIsNavigating(true)
                    }}
                    style={({ pressed }) => [
                      styles.stepRow,
                      {
                        borderTopWidth:
                          index === 0 ? 0 : StyleSheet.hairlineWidth * 2,
                        borderTopColor: theme.border,
                        backgroundColor: isActive
                          ? theme.primarySoft
                          : pressed
                            ? theme.surfaceMuted
                            : 'transparent',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.stepIndex,
                        {
                          backgroundColor: isDone
                            ? theme.success
                            : isActive
                              ? theme.primary
                              : theme.surfaceMuted,
                        },
                      ]}
                    >
                      {isDone ? (
                        <Check size={12} color={theme.onPrimary} strokeWidth={3} />
                      ) : (
                        <Text
                          style={[
                            typography.micro,
                            { color: isActive ? theme.onPrimary : theme.textMuted },
                          ]}
                        >
                          {index + 1}
                        </Text>
                      )}
                    </View>

                    <View style={styles.stepText}>
                      <Text
                        style={[
                          typography.bodyStrong,
                          { color: isActive ? theme.text : theme.textMuted },
                        ]}
                        numberOfLines={2}
                      >
                        {segment.instruction}
                      </Text>
                      <Text style={[typography.caption, { color: theme.textSubtle }]}>
                        {segment.fromName} → {segment.toName} · {segment.steps} steps
                        {segment.crossesFloor ? ' · change floor' : ''}
                      </Text>
                    </View>
                  </Pressable>
                )
              })}
            </Card>

            {!isNavigating ? (
              <Button
                label="Start navigation"
                icon={Navigation}
                size="lg"
                onPress={startNavigation}
                style={styles.startButton}
              />
            ) : null}
          </View>
        ) : !sourceNode ? (
          <Card>
            <EmptyState
              icon={LocateFixed}
              title="Set your starting room"
              message="Scan the Wi-Fi networks around you, or pick your room from the campus map, and ibnIPS will route you from there."
              action={
                <View style={styles.setupActions}>
                  <Button
                    label="Scan Wi-Fi"
                    icon={LocateFixed}
                    disabled={!position.isSupported || !position.canRescan}
                    onPress={() => {
                      haptics.medium()
                      void position.scan().then((node) => {
                        if (node) {
                          setSourceId(node.nodeId)
                        }
                      })
                    }}
                    style={styles.control}
                  />
                  <Button
                    label="Pick on map"
                    icon={MapPin}
                    variant="secondary"
                    onPress={() => router.push('/map')}
                    style={styles.control}
                  />
                </View>
              }
            />
            {!position.isSupported ? (
              <Text style={[typography.caption, styles.note, { color: theme.textSubtle }]}>
                {position.capability === 'current-only'
                  ? 'iOS does not allow apps to list nearby Wi-Fi networks.'
                  : 'Wi-Fi scanning needs a physical Android device.'}
              </Text>
            ) : null}
          </Card>
        ) : (
          <Card>
            <EmptyState
              icon={Flag}
              title="Choose a destination"
              message={`Pick a room and ibnIPS will work out the shortest walking route from ${
                sourceNode ? getLocationTitle(sourceNode) : 'your start point'
              }.`}
              action={
                <Button
                  label="Search rooms"
                  icon={Search}
                  onPress={() => router.push(`/search?purpose=destination&from=${sourceId}`)}
                />
              }
            />
          </Card>
        )}

        {position.positionNode && sourceNode ? (
          <Pressable
            onPress={() => router.push('/map')}
            style={({ pressed }) => [
              styles.linkRow,
              {
                backgroundColor: pressed ? theme.surfaceMuted : 'transparent',
              },
            ]}
          >
            <MapPin size={15} color={theme.textSubtle} />
            <Text style={[typography.caption, styles.linkText, { color: theme.textMuted }]}>
              Detected you at {getLocationTitle(position.positionNode)} ·{' '}
              {getFloorLabel(position.positionNode.floor)}
            </Text>
            <ArrowRight size={15} color={theme.textSubtle} />
          </Pressable>
        ) : null}
      </ScrollView>
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
  endpoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  endpointDot: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endpointText: {
    flex: 1,
    gap: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth * 2,
    marginVertical: spacing.md,
  },
  activeCard: {
    gap: spacing.md,
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  instruction: {
    lineHeight: 30,
  },
  progressTrack: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(128, 138, 158, 0.25)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  controls: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  control: {
    flex: 1,
  },
  controlWide: {
    flex: 1.4,
  },
  previewWrap: {
    gap: spacing.sm,
  },
  preview: {
    height: 220,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  previewSummary: {
    paddingHorizontal: spacing.xs,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  stepIndex: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    flex: 1,
    gap: 2,
  },
  startButton: {
    marginTop: spacing.lg,
  },
  setupActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  note: {
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  linkText: {
    flex: 1,
  },
})
