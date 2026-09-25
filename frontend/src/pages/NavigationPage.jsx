import { Footprints, LocateFixed, MapPinned, Navigation, ServerOff, WifiOff } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import EmptyState from '../components/EmptyState.jsx'
import IconButton from '../components/IconButton.jsx'
import MapCanvas from '../components/MapCanvas.jsx'
import MapFloatingControls from '../components/MapFloatingControls.jsx'
import NavigationBottomSheet from '../components/NavigationBottomSheet.jsx'
import { useNavigation } from '../hooks/useNavigation.js'
import { getFloorNodes, getNodesById } from '../map/mapGraph.js'
import { getFloorLabel, getLocationTitle } from '../utils/location.js'

const LEGEND = [
  { label: 'Walking route', color: '#6b8bff' },
  { label: 'Starting point', color: '#34d399' },
  { label: 'Destination', color: '#fbbf24' },
  { label: 'Current step', color: '#fbbf24' },
]

export default function NavigationPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const nodeId = searchParams.get('node')
  const startId = searchParams.get('from')
  const mapRef = useRef(null)
  const [showSourcePicker, setShowSourcePicker] = useState(false)

  const {
    catalogQuery,
    nodes,
    edges,
    routeDetails,
    isNavigating,
    currentSegment,
    nextSegment,
    progress,
    destinationNode,
    sourceNode,
    startNavigation,
    nextStep,
    previousStep,
    stopNavigation,
  } = useNavigation(nodeId, startId)

  const nodesById = useMemo(() => getNodesById(nodes), [nodes])

  const initialFloor = useMemo(() => {
    if (routeDetails) {
      return routeDetails.routeFloors[0] ?? destinationNode?.floor ?? null
    }
    return destinationNode?.floor ?? sourceNode?.floor ?? null
  }, [routeDetails, destinationNode, sourceNode])

  const [activeFloor, setActiveFloor] = useState(initialFloor)

  const displayFloor = useMemo(() => {
    if (activeFloor !== null) return activeFloor
    if (routeDetails) {
      const currentNode = currentSegment
        ? nodesById.get(currentSegment.toNodeId)
        : destinationNode
      if (currentNode && routeDetails.routeFloors.includes(currentNode.floor)) {
        return currentNode.floor
      }
      return routeDetails.routeFloors[0]
    }
    return initialFloor
  }, [activeFloor, routeDetails, currentSegment, destinationNode, nodesById, initialFloor])

  const displayNodes = useMemo(
    () => (displayFloor === null ? [] : getFloorNodes(nodes, displayFloor)),
    [nodes, displayFloor]
  )

  const floors = useMemo(() => {
    const floorSet = new Set()
    for (const node of nodes) {
      floorSet.add(node.floor)
    }
    return [...floorSet].sort((a, b) => a - b)
  }, [nodes])

  const legendItems = useMemo(() => {
    const items = []
    if (routeDetails) items.push(LEGEND[0])
    if (sourceNode) items.push(LEGEND[1])
    if (destinationNode) items.push(LEGEND[2])
    if (isNavigating && currentSegment) items.push(LEGEND[3])
    return items
  }, [routeDetails, sourceNode, destinationNode, isNavigating, currentSegment])

  const backTo = destinationNode
    ? `/map?node=${encodeURIComponent(destinationNode.nodeId)}${startId ? `&from=${encodeURIComponent(startId)}` : ''}`
    : '/map'

  const handleStartNavigation = useCallback(() => {
    if (startNavigation()) {
      setShowSourcePicker(false)
    }
  }, [startNavigation])

  const handleChangeSource = useCallback(() => {
    setShowSourcePicker(true)
  }, [])

  const handleClose = useCallback(() => {
    stopNavigation()
    setShowSourcePicker(false)
  }, [stopNavigation])

  const selectSourceNode = useCallback((node) => {
    navigate(`/navigate?node=${encodeURIComponent(nodeId)}&from=${encodeURIComponent(node.nodeId)}`, { replace: true })
    setShowSourcePicker(false)
  }, [navigate, nodeId])

  const clearSource = useCallback(() => {
    navigate(`/navigate?node=${encodeURIComponent(nodeId)}`, { replace: true })
    setShowSourcePicker(false)
  }, [navigate, nodeId])

if (!nodeId) {
    return <Navigate to="/map" replace />
  }

  if (catalogQuery.isPending) {
    return (
      <div className="app-canvas screen-fill flex flex-col overflow-hidden text-slate-100">
        <div className="shrink-0 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2">
          <div className="flex items-center gap-2">
            <IconButton label="Back to map" to={backTo}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </IconButton>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold tracking-[-0.02em] text-white">Loading navigation</p>
            </div>
          </div>
        </div>
        <div className="flex-1 animate-pulse bg-ink-850" />
      </div>
    )
  }

  if (catalogQuery.isError) {
    return (
      <div className="app-canvas screen-fill flex flex-col overflow-hidden text-slate-100">
        <div className="shrink-0 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2">
          <div className="flex items-center gap-2">
            <IconButton label="Back to map" to={backTo}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </IconButton>
          </div>
        </div>
        <div className="screen-scroll flex-1 px-3 pt-6">
          <EmptyState
            icon={ServerOff}
            tone="danger"
            title="Campus data unavailable"
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
      </div>
    )
  }

  if (!destinationNode) {
    return (
      <div className="app-canvas screen-fill flex flex-col overflow-hidden text-slate-100">
        <div className="shrink-0 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2">
          <div className="flex items-center gap-2">
            <IconButton label="Back to map" to={backTo}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </IconButton>
          </div>
        </div>
        <div className="screen-scroll flex-1 px-3 pt-6">
          <EmptyState
            icon={MapPinned}
            title="Destination not found"
            description="This location is not part of the current campus map."
            action={
              <Link
                to="/search"
                className="inline-flex min-h-11 items-center rounded-2xl border border-white/12 bg-white/5 px-4 text-sm font-semibold text-white active:bg-white/10"
              >
                Search destinations
              </Link>
            }
          />
        </div>
      </div>
    )
  }

  const currentLocationUnavailable = (
    <div className="mt-3 rounded-card border border-amber-400/20 bg-amber-400/8 p-3">
      <p className="flex items-center gap-2 text-sm font-bold text-amber-100">
        <WifiOff size={16} aria-hidden="true" />
        Live positioning unavailable
      </p>
      <p className="mt-1 text-xs leading-5 text-amber-100/70">
        A browser cannot read Wi-Fi fingerprints and the backend has no
        position endpoint. Pick your starting point manually.
      </p>
    </div>
  )

  return (
    <div className="app-canvas screen-fill flex flex-col overflow-hidden text-slate-100">
      <div className="shrink-0 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2">
        <div className="flex items-center gap-2">
          <IconButton label="Back to map" to={backTo}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </IconButton>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold tracking-[-0.02em] text-white">
              {destinationNode ? `To ${getLocationTitle(destinationNode)}` : 'Navigation'}
            </p>
            <p className="truncate text-[11px] text-slate-400">
              {routeDetails
                ? `${routeDetails.totalSteps} steps · ${routeDetails.totalSegments} moves`
                : destinationNode
                ? getFloorLabel(destinationNode.floor)
                : 'Campus map'}
            </p>
          </div>
        </div>

        {floors.length > 1 && (
          <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1">
            {floors.map((floor) => (
              <button
                key={floor}
                type="button"
                onClick={() => setActiveFloor(floor)}
                className={`shrink-0 rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors ${
                  floor === displayFloor
                    ? 'bg-brand-500 text-ink-950 shadow-accent'
                    : 'bg-ink-850 text-slate-400 hover:text-slate-200'
                }`}
              >
                {getFloorLabel(floor).replace('Floor ', 'F')}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative min-h-0 flex-1">
        <div className="relative h-[46dvh] min-h-[15rem] shrink-0">
          <MapCanvas
            ref={mapRef}
            nodes={displayNodes}
            edges={edges}
            selectedNodeId={nodeId}
            startNodeId={isNavigating && currentSegment ? currentSegment.fromNodeId : startId}
            currentNodeId={isNavigating && currentSegment ? currentSegment.toNodeId : null}
            route={routeDetails}
            caption={`${getFloorLabel(displayFloor)} · ${routeDetails ? 'route' : 'destination'}`}
            legendItems={legendItems}
            emptyMessage="No locations on this floor yet."
            className="h-full w-full rounded-none border-0"
          />

          <MapFloatingControls
            onZoomIn={() => mapRef.current?.zoomIn()}
            onZoomOut={() => mapRef.current?.zoomOut()}
            onFit={() => mapRef.current?.reset()}
            onRecenter={() => mapRef.current?.focusNode(nodeId)}
            canRecenter
          />
        </div>

        <div className="screen-scroll min-h-0 flex-1 px-3 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {!routeDetails ? (
            <section className="rounded-card border border-white/10 bg-ink-850 p-4">
              <h2 className="text-base font-extrabold tracking-[-0.02em] text-white">
                {sourceNode
                  ? `No walking route from ${getLocationTitle(sourceNode)}`
                  : 'No starting point chosen'}
              </h2>
              <p className="mt-1.5 text-sm leading-6 text-slate-400">
                {sourceNode
                  ? 'The published edges do not connect these two locations, so no route is drawn.'
                  : 'Pick where you are on the map to compute a route from the real edge graph.'}
              </p>
              <div className="mt-4 grid gap-2">
                <Link
                  to={`/map?node=${encodeURIComponent(nodeId)}`}
                  className="inline-flex min-h-13 items-center justify-center rounded-2xl bg-brand-500 px-5 text-sm font-bold text-ink-950 shadow-accent transition-colors active:bg-brand-600"
                >
                  Choose a starting point
                </Link>
                <Link
                  to="/search"
                  className="inline-flex min-h-13 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 text-sm font-semibold text-white transition-colors active:bg-white/10"
                >
                  Choose another destination
                </Link>
              </div>
            </section>
          ) : (
            <>
              {showSourcePicker ? (
                <section className="rounded-card border border-brand-400/25 bg-ink-850 p-4">
                  <h2 className="text-base font-extrabold tracking-[-0.02em] text-white">Select starting point</h2>
                  <p className="mt-1.5 text-sm leading-6 text-slate-400">
                    Tap a location on the map or choose from the list below.
                  </p>
                  <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                    {nodes
                      .filter((n) => n.nodeId !== destinationNode?.nodeId)
                      .slice(0, 20)
                      .map((node) => (
                        <button
                          key={node.nodeId}
                          type="button"
                          onClick={() => selectSourceNode(node)}
                          className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-white/10 bg-white/4 px-3 text-left transition-colors active:bg-white/8"
                        >
                          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-200">
                            <Footprints size={18} aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-white">{node.name}</span>
                            <span className="block truncate text-xs text-slate-500">{getFloorLabel(node.floor)}</span>
                          </span>
                        </button>
                      ))}
                  </div>
                  {sourceNode && (
                    <button
                      type="button"
                      onClick={clearSource}
                      className="mt-3 w-full inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-red-400/30 bg-red-500/10 px-5 text-sm font-semibold text-red-300 transition-colors active:bg-red-500/20"
                    >
                      <LocateFixed size={17} aria-hidden="true" />
                      Clear starting point
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowSourcePicker(false)}
                    className="mt-2 w-full inline-flex min-h-11 items-center justify-center rounded-2xl text-sm font-semibold text-slate-400"
                  >
                    Cancel
                  </button>
                </section>
              ) : (
                <>
                  {routeDetails && (
                    <section className="rounded-card border border-brand-400/25 bg-ink-850 p-4 mb-3">
                      <div className="flex items-center gap-3">
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-500/15 text-brand-200">
                          <Navigation size={20} aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <h2 className="truncate text-base font-extrabold tracking-[-0.02em] text-white">
                            {routeDetails.totalSteps} steps to {getLocationTitle(destinationNode)}
                          </h2>
                          <p className="mt-0.5 truncate text-xs text-slate-400">
                            From {getLocationTitle(sourceNode)}
                            {routeDetails.routeFloors.length > 1
                              ? ` · crosses floors ${routeDetails.routeFloors.join(', ')}`
                              : ''}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-400">
                        <span className="flex-1 h-px bg-white/10" />
                        <span>PROGRESS: {progress.current}/{progress.total} ({progress.percentage}%)</span>
                        <span className="flex-1 h-px bg-white/10" />
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-brand-500 transition-all duration-300 ease-out"
                          style={{ width: `${progress.percentage}%` }}
                        />
                      </div>
                    </section>
                  )}

                  {currentLocationUnavailable}
                </>
              )}
            </>
          )}

          <NavigationBottomSheet
            routeDetails={routeDetails}
            destinationNode={destinationNode}
            sourceNode={sourceNode}
            currentSegment={currentSegment}
            nextSegment={nextSegment}
            progress={progress}
            isNavigating={isNavigating}
            onStartNavigation={handleStartNavigation}
            onNextStep={nextStep}
            onPreviousStep={previousStep}
            onStopNavigation={stopNavigation}
            onChangeSource={handleChangeSource}
            onClose={handleClose}
          />
        </div>
      </div>
    </div>
  )
}