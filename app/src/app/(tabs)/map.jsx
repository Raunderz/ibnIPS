import { useCallback, useMemo, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Crosshair, Layers, MapPin, Navigation, RotateCcw, Search } from 'lucide-react-native'
import { usePosition } from '../../positioning/PositionProvider.jsx'
import { getFloorCounts, getFloorEdges, getFloorNodes, getFloors } from '../../map/mapGraph.js'
import { getFloorLabel, getLocationCountLabel } from '../../utils/location.js'
import { haptics } from '../../utils/haptics.js'
import { radius, spacing, typography, useTheme } from '../../theme/index.js'
import { Badge } from '../../components/Badge.jsx'
import { Button } from '../../components/Button.jsx'
import { CampusMap } from '../../components/CampusMap.jsx'
import { Card } from '../../components/Card.jsx'
import { EmptyState } from '../../components/EmptyState.jsx'
import { FloorSelector } from '../../components/FloorSelector.jsx'

/** Stable identities, so memos downstream are not invalidated while loading. */
const EMPTY_NODES = []
const EMPTY_EDGES = []

export default function MapScreen() {
  const theme = useTheme()
  const router = useRouter()
  const params = useLocalSearchParams()
  const position = usePosition()
  const mapRef = useRef(null)

  const catalog = position.catalog
  const nodes = catalog?.nodes ?? EMPTY_NODES
  const edges = catalog?.edges ?? EMPTY_EDGES
  const floors = useMemo(() => getFloors(nodes), [nodes])
  const floorCounts = useMemo(() => getFloorCounts(nodes), [nodes])

  const [floor, setFloor] = useState(() => floors[0] ?? 1)
  const [selectedNode, setSelectedNode] = useState(null)

  const requestedNodeId = typeof params.node === 'string' ? params.node : null

  // Arriving from search with ?node=… should jump straight to that room.
  const requestedNode = useMemo(
    () => nodes.find((entry) => entry.nodeId === requestedNodeId) ?? null,
    [nodes, requestedNodeId],
  )

  // Adjust during render rather than in an effect, which would cost an extra
  // render pass every time the deep link or the floor list changes.
  const [syncedRequest, setSyncedRequest] = useState(requestedNodeId)

  if (syncedRequest !== requestedNodeId) {
    setSyncedRequest(requestedNodeId)

    if (requestedNode) {
      setFloor(requestedNode.floor)
      setSelectedNode(requestedNode)
    }
  }

  if (floors.length > 0 && !floors.includes(floor)) {
    setFloor(floors[0])
  }

  const floorNodes = useMemo(() => getFloorNodes(nodes, floor), [floor, nodes])

  const floorEdges = useMemo(
    () => getFloorEdges(edges, new Set(floorNodes.map((node) => node.nodeId))),
    [edges, floorNodes],
  )

  const positionNodeId = position.positionNode?.nodeId ?? null

  const selectNode = useCallback(
    (node) => {
      haptics.selection()
      setSelectedNode(node)
    },
    [],
  )

  const setAsMyLocation = () => {
    if (!selectedNode) {
      return
    }

    haptics.success()
    position.setManualPosition(selectedNode)
    setSelectedNode(null)
  }

  if (nodes.length === 0) {
    return (
      <SafeAreaView
        style={[styles.root, { backgroundColor: theme.background }]}
        edges={['top']}
      >
        <View style={styles.centered}>
          <EmptyState
            icon={Layers}
            title="No campus map yet"
            message={
              position.catalogError
                ? 'The backend did not return a map. Check the backend address on the Account screen.'
                : 'The backend returned no locations. Publish a map.json with nodes and edges to populate the campus.'
            }
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

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.background }]}
      edges={['top']}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[typography.title, { color: theme.text }]}>Campus map</Text>
          <Text style={[typography.caption, { color: theme.textMuted }]}>
            {getLocationCountLabel(nodes.length)} · Floor {floor}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reset map view"
          onPress={() => {
            haptics.light()
            mapRef.current?.reset()
          }}
          style={({ pressed }) => [
            styles.iconButton,
            {
              backgroundColor: pressed ? theme.surfaceMuted : theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <RotateCcw size={17} color={theme.text} />
        </Pressable>
      </View>

      <FloorSelector
        floors={floors}
        counts={floorCounts}
        selected={floor}
        onSelect={(next) => {
          haptics.selection()
          setFloor(next)
          setSelectedNode(null)
        }}
      />

      <View style={styles.mapArea}>
        <CampusMap
          ref={mapRef}
          nodes={floorNodes}
          edges={floorEdges}
          viewKey={`${floor}-${floorNodes.length}`}
          positionNodeId={positionNodeId}
          selectedNodeId={selectedNode?.nodeId ?? null}
          sourceNodeId={positionNodeId}
          onSelectNode={selectNode}
        />
      </View>

      <View style={styles.sheet}>
        {selectedNode ? (
          <Card>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetText}>
                <Text style={[typography.heading, { color: theme.text }]} numberOfLines={1}>
                  {selectedNode.name}
                </Text>
                <Text style={[typography.caption, { color: theme.textMuted }]}>
                  {getFloorLabel(selectedNode.floor)} · {selectedNode.nodeId}
                </Text>
              </View>

              {selectedNode.nodeId === positionNodeId ? (
                <Badge label="You are here" tone="accent" />
              ) : null}
            </View>

            <View style={styles.sheetActions}>
              <Button
                label="I'm here"
                icon={Crosshair}
                variant={positionNodeId === selectedNode.nodeId ? 'ghost' : 'primary'}
                size="sm"
                onPress={setAsMyLocation}
                style={styles.flexAction}
              />
              <Button
                label="Go here"
                icon={Navigation}
                variant="secondary"
                size="sm"
                onPress={() =>
                  router.push(`/navigate?to=${selectedNode.nodeId}`)
                }
                style={styles.flexAction}
              />
            </View>
          </Card>
        ) : (
          <Card>
            <View style={styles.hintRow}>
              <MapPin size={18} color={theme.textSubtle} />
              <Text style={[typography.body, styles.hint, { color: theme.textMuted }]}>
                {positionNodeId
                  ? 'Tap a room to set it as your location or plan a route to it. Pinch to zoom, drag to pan.'
                  : 'Tap a room on the map to select it. Pinch to zoom, drag to pan.'}
              </Text>
            </View>

            <Button
              label="Search for a room"
              icon={Search}
              variant="ghost"
              size="sm"
              onPress={() => router.push('/search?purpose=browse')}
            />
          </Card>
        )}
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  mapArea: {
    flex: 1,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'transparent',
  },
  sheet: {
    padding: spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sheetText: {
    flex: 1,
    gap: 2,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flexAction: {
    flex: 1,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  hint: {
    flex: 1,
    lineHeight: 20,
  },
})
