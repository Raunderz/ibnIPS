import { MapPinned, Search, ServerOff } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import EmptyState from '../components/EmptyState.jsx'
import FloorSelector from '../components/FloorSelector.jsx'
import IconButton from '../components/IconButton.jsx'
import MapBottomSheet from '../components/MapBottomSheet.jsx'
import MapCanvas from '../components/MapCanvas.jsx'
import MapFloatingControls from '../components/MapFloatingControls.jsx'
import { useLocationCatalog } from '../hooks/useLocationCatalog.js'
import { useMapRoute } from '../hooks/useMapRoute.js'
import { useRecentDestinations } from '../hooks/useRecentDestinations.js'
import {
  getConnectedLinks,
  getFloorCounts,
  getFloorNodes,
  getFloors,
} from '../map/mapGraph.js'
import { getMapViewState } from '../map/mapViewState.js'
import {
  getFloorCountLabel,
  getFloorLabel,
  getLocationCountLabel,
} from '../utils/location.js'

const EMPTY_NODES = []
const EMPTY_EDGES = []

const LEGEND = {
  start: { label: 'Starting point', color: '#34d399' },
  current: { label: 'Current location', color: '#38bdf8' },
  destination: { label: 'Destination', color: '#fbbf24' },
  route: { label: 'Walking route', color: '#6b8bff' },
}

export default function MapPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const selectedId = searchParams.get('node')
  const startId = searchParams.get('from')
  const catalogQuery = useLocationCatalog()
  const { record } = useRecentDestinations()
  const [floorChoice, setFloorChoice] = useState(null)
  const mapRef = useRef(null)

  const catalog = catalogQuery.data
  const nodes = useMemo(() => catalog?.nodes ?? EMPTY_NODES, [catalog])
  const edges = useMemo(() => catalog?.edges ?? EMPTY_EDGES, [catalog])
  const fingerprintCounts = catalog?.fingerprintCounts ?? {}
  const floors = useMemo(() => getFloors(nodes), [nodes])
  const floorCounts = useMemo(() => getFloorCounts(nodes), [nodes])
  const nodesById = useMemo(
    () => new Map(nodes.map((node) => [node.nodeId, node])),
    [nodes],
  )

  const selectedNode = selectedId ? (nodesById.get(selectedId) ?? null) : null
  const startNode = startId ? (nodesById.get(startId) ?? null) : null
  const activeFloor = selectedNode?.floor ?? startNode?.floor ?? floorChoice ?? floors[0] ?? null

  const { route, routeFloors } = useMapRoute(nodes, edges, startId, selectedId)
  const links = useMemo(
    () => (selectedNode ? getConnectedLinks(edges, selectedNode.nodeId) : []),
    [edges, selectedNode],
  )

  const displayFloor = route
    ? (routeFloors.includes(activeFloor) ? activeFloor : routeFloors[0])
    : activeFloor
  const displayNodes = useMemo(
    () => getFloorNodes(nodes, displayFloor),
    [nodes, displayFloor],
  )

  const viewState = getMapViewState({
    isPending: catalogQuery.isPending,
    isError: catalogQuery.isError,
    nodeCount: nodes.length,
  })

  useEffect(() => {
    if (selectedNode) {
      record(selectedNode)
    }
  }, [selectedNode, record])

  const updateParams = useCallback(
    (changes) => {
      const next = new URLSearchParams(searchParams)

      for (const [key, value] of Object.entries(changes)) {
        if (value) {
          next.set(key, value)
        } else {
          next.delete(key)
        }
      }

      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const selectNode = useCallback(
    (node) => {
      updateParams({ node: node ? node.nodeId : null })
    },
    [updateParams],
  )

  const legendItems = useMemo(() => {
    const items = []

    if (route) {
      items.push(LEGEND.route)
    }

    if (startNode) {
      items.push(LEGEND.start)
    }

    if (selectedNode) {
      items.push(LEGEND.destination)
    }

    return items
  }, [route, startNode, selectedNode])

  return (
    <div className="app-canvas screen-fill flex flex-col overflow-hidden text-slate-100">
      <div className="shrink-0 space-y-2 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2">
        <div className="flex items-center gap-2">
          <IconButton label="Back to home" to="/">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M15 5l-7 7 7 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </IconButton>
          <Link
            to="/search"
            className="flex min-h-11 flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-ink-850/90 px-3.5 text-sm text-slate-400 backdrop-blur transition-colors duration-150 active:bg-ink-800"
          >
            <Search size={17} aria-hidden="true" />
            Search campus locations
          </Link>
        </div>

        <FloorSelector
          floors={floors}
          counts={floorCounts}
          activeFloor={activeFloor}
          onChange={(floor) => {
            setFloorChoice(floor)
            updateParams({ node: null })
          }}
        />
      </div>

      <div className="relative min-h-0 flex-1">
        {viewState === 'loading' ? (
          <div className="absolute inset-0 animate-pulse bg-ink-850" />
        ) : viewState === 'error' ? (
          <div className="screen-scroll absolute inset-0 px-3 pt-6">
            <EmptyState
              icon={ServerOff}
              tone="danger"
              title="Map unavailable"
              description={catalogQuery.error.message}
              action={
                <button
                  type="button"
                  onClick={() => catalogQuery.refetch()}
                  className="inline-flex min-h-11 items-center rounded-2xl border border-white/12 bg-white/5 px-4 text-sm font-semibold text-white active:bg-white/10"
                >
                  Try again
                </button>
              }
            />
          </div>
        ) : viewState === 'empty' ? (
          <div className="screen-scroll absolute inset-0 px-3 pt-6">
            <EmptyState
              icon={MapPinned}
              title="No campus map published"
              description="The backend returned no nodes or map edges yet, so there is nothing to draw."
              action={
                <Link
                  to="/search"
                  className="inline-flex min-h-11 items-center rounded-2xl border border-white/12 bg-white/5 px-4 text-sm font-semibold text-white active:bg-white/10"
                >
                  Go to search
                </Link>
              }
            />
          </div>
        ) : (
          <>
            <MapCanvas
              ref={mapRef}
              nodes={displayNodes}
              edges={edges}
              selectedNodeId={selectedId}
              startNodeId={startId}
              currentNodeId={null}
              route={route}
              onSelectNode={selectNode}
              caption={`${getFloorLabel(displayFloor)} · ${getLocationCountLabel(
                displayNodes.length,
              )}`}
              legendItems={legendItems}
              emptyMessage="No locations on this floor yet."
              className="h-full w-full rounded-none border-0"
            />

            <MapFloatingControls
              onZoomIn={() => mapRef.current?.zoomIn()}
              onZoomOut={() => mapRef.current?.zoomOut()}
              onFit={() => mapRef.current?.reset()}
              onRecenter={() => mapRef.current?.focusNode(selectedId)}
              canRecenter={Boolean(selectedId)}
            />

            <MapBottomSheet
              node={selectedNode}
              startNode={startNode}
              route={route}
              routeFloors={routeFloors}
              linkCount={links.length}
              fingerprintCount={fingerprintCounts[selectedId] ?? 0}
              canStartFromSelection={Boolean(startNode && selectedId !== startId)}
              onSetStart={(node) => updateParams({ from: node.nodeId })}
              onClearStart={() => updateParams({ from: null })}
              onStartNavigation={() =>
                navigate(
                  `/navigate?node=${encodeURIComponent(
                    selectedId,
                  )}&from=${encodeURIComponent(startId ?? '')}`,
                )
              }
              onClearSelection={() => selectNode(null)}
            />
          </>
        )}

        {viewState === 'ready' ? (
          <p className="pointer-events-none absolute top-2 right-14 rounded-lg border border-white/10 bg-ink-950/80 px-2 py-1 text-[0.65rem] font-medium text-slate-400 backdrop-blur">
            {route
              ? `${route.totalSteps} steps · ${route.segments.length} moves`
              : floors.length > 1
                ? `${getFloorCountLabel(floors.length)} · pinch to zoom`
                : 'Pinch to zoom · drag to pan'}
          </p>
        ) : null}
      </div>
    </div>
  )
}
