import { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { getRoutePathsByFloor } from '../map/mapGraph.js'
import {
  getFitView,
  getNodeFocusTransform,
  getPinchTransform,
  getUnitsPerPixel,
  IDENTITY,
  panBy,
  zoomAround,
  zoomAroundCenter,
} from '../map/mapViewport.js'

const NODE_RADIUS = 13
const SELECTED_RADIUS = 18
const TAP_SLOP = 8
const KEYBOARD_NODE_LIMIT = 100
const LABEL_NODE_LIMIT = 200
const FIT_PADDING = 70
const FOCUS_PADDING = 380
const FOCUS_SCALE = 1.8
const ZOOM_STEP = 1.4

function NodeMarker({ node, isSelected, interactive, showLabel, onSelect }) {
  return (
    <g
      transform={`translate(${node.x} ${node.y})`}
      tabIndex={interactive ? 0 : -1}
      role={interactive ? 'button' : undefined}
      aria-label={interactive ? `${node.name}, floor ${node.floor}` : undefined}
      className={interactive ? 'cursor-pointer outline-none' : undefined}
      onPointerDown={interactive ? (event) => event.stopPropagation() : undefined}
      onClick={interactive ? () => onSelect?.(node) : undefined}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelect?.(node)
              }
            }
          : undefined
      }
    >
      <circle
        r={isSelected ? SELECTED_RADIUS + 20 : SELECTED_RADIUS + 12}
        fill="rgb(107 139 255 / 0.18)"
        className="opacity-0 transition-opacity duration-150 focus-visible:opacity-100"
      />
      {isSelected ? (
        <circle r={SELECTED_RADIUS + 12} fill="rgb(107 139 255 / 0.22)" />
      ) : null}
      <circle
        r={isSelected ? SELECTED_RADIUS : NODE_RADIUS}
        fill={isSelected ? '#6b8bff' : '#0a0f18'}
        stroke={isSelected ? '#e8eeff' : 'rgb(203 213 225 / 0.85)'}
        strokeWidth={4}
      />
      {showLabel ? (
        <text
          y={-(isSelected ? SELECTED_RADIUS : NODE_RADIUS) - 12}
          textAnchor="middle"
          fontSize={26}
          fontWeight={600}
          fill={isSelected ? '#e8eeff' : 'rgb(203 213 225 / 0.78)'}
          style={{ pointerEvents: 'none' }}
        >
          {node.name}
        </text>
      ) : null}
    </g>
  )
}

function StartMarker({ node }) {
  return (
    <g
      transform={`translate(${node.x} ${node.y})`}
      style={{ pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <circle r={26} fill="rgb(52 211 153 / 0.18)" className="map-pulse" />
      <circle r={15} fill="#0a0f18" stroke="#34d399" strokeWidth={5} />
      <circle r={5} fill="#34d399" />
    </g>
  )
}

function CurrentMarker({ node }) {
  return (
    <g
      transform={`translate(${node.x} ${node.y})`}
      style={{ pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <circle r={30} fill="rgb(56 189 248 / 0.22)" className="map-pulse" />
      <circle r={13} fill="#0a0f18" stroke="#38bdf8" strokeWidth={5} />
      <circle r={4} fill="#38bdf8" />
    </g>
  )
}

function DestinationMarker({ node }) {
  return (
    <g
      transform={`translate(${node.x} ${node.y})`}
      style={{ pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <circle r={30} fill="rgb(251 191 36 / 0.2)" />
      <circle r={17} fill="#0a0f18" stroke="#fbbf24" strokeWidth={5} />
      <path
        d="M0 -8 L3.2 -2.4 L9.2 -2.4 L4.8 1 L6.6 7 L0 3.4 L-6.6 7 L-4.8 1 L-9.2 -2.4 L-3.2 -2.4 Z"
        fill="#fbbf24"
      />
    </g>
  )
}

export default function MapCanvas({
  ref,
  nodes,
  edges,
  selectedNodeId = null,
  startNodeId = null,
  currentNodeId = null,
  route = null,
  onSelectNode,
  caption = '',
  legendItems = [],
  emptyMessage = 'No published locations on this floor.',
  className = '',
}) {
  const svgRef = useRef(null)
  const rectRef = useRef(null)
  const viewRef = useRef(null)
  const transformRef = useRef(IDENTITY)
  const pointersRef = useRef(new Map())
  const panRef = useRef(null)
  const pinchRef = useRef(null)
  const previousRef = useRef({ nodes, selectedNodeId, startNodeId })
  const [transform, setTransform] = useState(IDENTITY)
  const [aspect, setAspect] = useState(1)

  const nodesById = useMemo(() => {
    const map = new Map()

    for (const node of nodes) {
      map.set(node.nodeId, node)
    }

    return map
  }, [nodes])

  const showLabels = nodes.length <= LABEL_NODE_LIMIT
  const keyboardInteractive = nodes.length <= KEYBOARD_NODE_LIMIT

  const view = useMemo(
    () => getFitView(nodes, aspect, selectedNodeId ? FOCUS_PADDING : FIT_PADDING),
    [nodes, aspect, selectedNodeId],
  )

  const routePaths = useMemo(
    () => [...getRoutePathsByFloor(route, nodesById).values()],
    [route, nodesById],
  )

  useEffect(() => {
    const previous = previousRef.current

    if (
      previous.nodes !== nodes ||
      previous.selectedNodeId !== selectedNodeId ||
      previous.startNodeId !== startNodeId
    ) {
      previousRef.current = { nodes, selectedNodeId, startNodeId }
      setTransform(IDENTITY)
    }
  }, [nodes, selectedNodeId, startNodeId])

  useEffect(() => {
    const element = svgRef.current

    if (!element || typeof ResizeObserver === 'undefined') {
      return undefined
    }

    const measure = () => {
      const bounds = element.getBoundingClientRect()

      rectRef.current = bounds

      if (bounds.width > 0 && bounds.height > 0) {
        setAspect(bounds.width / bounds.height)
      }
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    window.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
    }
  }, [])

  useEffect(() => {
    viewRef.current = view
    transformRef.current = transform
  })

  function toMapPoint(clientX, clientY) {
    const bounds = rectRef.current ?? svgRef.current?.getBoundingClientRect()
    const currentView = viewRef.current

    if (!bounds || !bounds.width || !bounds.height || !currentView) {
      return { x: 0, y: 0 }
    }

    return {
      x: currentView.minX + ((clientX - bounds.left) / bounds.width) * currentView.width,
      y:
        currentView.minY +
        ((clientY - bounds.top) / bounds.height) * currentView.height,
    }
  }

  useEffect(() => {
    const element = svgRef.current

    if (!element) {
      return undefined
    }

    const handleWheel = (event) => {
      event.preventDefault()
      const focal = toMapPoint(event.clientX, event.clientY)

      setTransform((current) =>
        zoomAround(current, event.deltaY < 0 ? 1.2 : 1 / 1.2, focal.x, focal.y),
      )
    }

    element.addEventListener('wheel', handleWheel, { passive: false })

    return () => element.removeEventListener('wheel', handleWheel)
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      zoomIn() {
        setTransform((current) => zoomAroundCenter(view, current, ZOOM_STEP))
      },
      zoomOut() {
        setTransform((current) => zoomAroundCenter(view, current, 1 / ZOOM_STEP))
      },
      reset() {
        setTransform(IDENTITY)
      },
      focusNode(nodeId) {
        const node = nodesById.get(nodeId)

        if (!node) {
          setTransform(IDENTITY)
          return
        }

        setTransform(getNodeFocusTransform(node, view, FOCUS_SCALE))
      },
    }),
    [view, nodesById],
  )

  function startPinch() {
    const [first, second] = [...pointersRef.current.values()]
    const start = toMapPoint(
      (first.clientX + second.clientX) / 2,
      (first.clientY + second.clientY) / 2,
    )
    const distance = Math.hypot(
      first.clientX - second.clientX,
      first.clientY - second.clientY,
    )
    const origin = transformRef.current

    pinchRef.current = {
      scale: origin.scale,
      x: origin.x,
      y: origin.y,
      centerX: start.x,
      centerY: start.y,
      distance,
    }

    if (panRef.current) {
      panRef.current.moved = true
    }
  }

  function handlePointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return
    }

    rectRef.current = event.currentTarget.getBoundingClientRect()
    pointersRef.current.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY,
    })
    event.currentTarget.setPointerCapture(event.pointerId)

    if (pointersRef.current.size === 1) {
      const origin = transformRef.current
      panRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: origin.x,
        originY: origin.y,
        moved: false,
      }
      pinchRef.current = null
      return
    }

    if (pointersRef.current.size === 2) {
      startPinch()
    }
  }

  function handlePointerMove(event) {
    if (!pointersRef.current.has(event.pointerId)) {
      return
    }

    pointersRef.current.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY,
    })

    if (pinchRef.current && pointersRef.current.size >= 2) {
      const [first, second] = [...pointersRef.current.values()]
      const center = toMapPoint(
        (first.clientX + second.clientX) / 2,
        (first.clientY + second.clientY) / 2,
      )
      const distance = Math.hypot(
        first.clientX - second.clientX,
        first.clientY - second.clientY,
      )

      setTransform(getPinchTransform(pinchRef.current, { ...center, distance }))
      return
    }

    const pan = panRef.current

    if (!pan || pan.pointerId !== event.pointerId) {
      return
    }

    const deltaX = event.clientX - pan.startX
    const deltaY = event.clientY - pan.startY

    if (Math.abs(deltaX) > TAP_SLOP || Math.abs(deltaY) > TAP_SLOP) {
      pan.moved = true
    }

    setTransform((current) =>
      panBy(
        { scale: current.scale, x: pan.originX, y: pan.originY },
        deltaX,
        deltaY,
        getUnitsPerPixel(viewRef.current, rectRef.current),
      ),
    )
  }

  function handlePointerUp(event) {
    pointersRef.current.delete(event.pointerId)

    if (pointersRef.current.size < 2) {
      pinchRef.current = null
    }

    if (pointersRef.current.size === 1) {
      const [pointerId, pointer] = [...pointersRef.current.entries()][0]
      const origin = transformRef.current
      panRef.current = {
        pointerId,
        startX: pointer.clientX,
        startY: pointer.clientY,
        originX: origin.x,
        originY: origin.y,
        moved: true,
      }
      return
    }

    if (pointersRef.current.size > 0) {
      return
    }

    const pan = panRef.current
    panRef.current = null

    if (pan && !pan.moved) {
      onSelectNode?.(null)
    }
  }

  const content = useMemo(() => {
    if (nodes.length === 0) {
      return null
    }

    const segments = []

    for (const edge of edges) {
      const from = nodesById.get(edge.fromNode)
      const to = nodesById.get(edge.toNode)

      if (from && to) {
        segments.push(
          <line
            key={`${edge.fromNode}->${edge.toNode}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="rgb(148 163 184 / 0.42)"
            strokeWidth={6}
            strokeLinecap="round"
          />,
        )
      }
    }

    const routes = routePaths.map((path, index) => (
      <g key={`route-${index}`}>
        <path
          d={path}
          fill="none"
          stroke="rgb(107 139 255 / 0.3)"
          strokeWidth={22}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          className="map-route-flow"
          d={path}
          fill="none"
          stroke="#6b8bff"
          strokeWidth={11}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    ))

    const markers = nodes.map((node) => {
      if (node.nodeId === currentNodeId) {
        return <CurrentMarker key={node.nodeId} node={node} />
      }

      if (node.nodeId === startNodeId) {
        return <StartMarker key={node.nodeId} node={node} />
      }

      if (node.nodeId === selectedNodeId) {
        return <DestinationMarker key={node.nodeId} node={node} />
      }

      return (
        <NodeMarker
          key={node.nodeId}
          node={node}
          isSelected={false}
          interactive={keyboardInteractive}
          showLabel={showLabels}
          onSelect={onSelectNode}
        />
      )
    })

    return (
      <>
        {segments}
        {routes}
        {markers}
      </>
    )
  }, [
    edges,
    keyboardInteractive,
    nodes,
    nodesById,
    onSelectNode,
    routePaths,
    selectedNodeId,
    showLabels,
    startNodeId,
    currentNodeId,
  ])

  if (nodes.length === 0) {
    return (
      <div
        className={`grid place-items-center rounded-card border border-white/8 bg-ink-900 p-6 ${className}`}
      >
        <p className="max-w-[18rem] text-center text-sm leading-6 text-slate-400">
          {emptyMessage}
        </p>
      </div>
    )
  }

  return (
    <div
      className={`relative overflow-hidden rounded-card border border-white/8 bg-ink-900 ${className}`}
    >
      <svg
        ref={svgRef}
        viewBox={`${view.minX} ${view.minY} ${view.width} ${view.height}`}
        className="h-full w-full touch-none select-none"
        role="img"
        aria-label={`Campus map with ${nodes.length} locations${
          route ? ` and a route of ${route.totalSteps} steps` : ''
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <defs>
          <pattern
            id="map-grid"
            width="80"
            height="80"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="2" fill="rgb(148 163 184 / 0.1)" />
          </pattern>
        </defs>
        <g
          transform={`translate(${transform.x} ${transform.y}) scale(${transform.scale})`}
        >
          <rect
            x={view.minX - 4000}
            y={view.minY - 4000}
            width={view.width + 8000}
            height={view.height + 8000}
            fill="url(#map-grid)"
          />
          {content}
        </g>
      </svg>

      {caption ? (
        <span className="pointer-events-none absolute top-3 left-3 rounded-xl border border-white/10 bg-ink-950/80 px-2.5 py-1.5 text-xs font-semibold text-slate-300 backdrop-blur">
          {caption}
        </span>
      ) : null}

      {legendItems.length > 0 ? (
        <ul className="pointer-events-none absolute top-12 left-3 flex flex-col items-start gap-1.5">
          {legendItems.map((item) => (
            <li
              key={item.label}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-ink-950/80 px-2 py-1 text-[0.65rem] font-medium text-slate-300 backdrop-blur"
            >
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
