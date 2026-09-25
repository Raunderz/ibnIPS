import { findRoute, getNodesById, getRouteFloors, getRoutePathsByFloor } from '../map/mapGraph.js'

const NAVIGATION_STORAGE_KEY = 'ibnips_navigation_state'

export function createNavigationService(nodes, edges) {
  const nodesById = getNodesById(nodes)

  function calculateRoute(fromNodeId, toNodeId) {
    if (!fromNodeId || !toNodeId) {
      return null
    }
    return findRoute(edges, fromNodeId, toNodeId)
  }

  function getRouteDetails(route) {
    if (!route) {
      return null
    }

    const routeFloors = getRouteFloors(route, nodesById)
    const pathsByFloor = getRoutePathsByFloor(route, nodesById)
    const segments = route.segments.map((segment, index) => {
      const from = nodesById.get(segment.fromNodeId)
      const to = nodesById.get(segment.toNodeId)
      const crossesFloor = from && to && from.floor !== to.floor

      return {
        index,
        fromNodeId: segment.fromNodeId,
        toNodeId: segment.toNodeId,
        fromName: from ? from.name : segment.fromNodeId,
        toName: to ? to.name : segment.toNodeId,
        fromFloor: from?.floor ?? null,
        toFloor: to?.floor ?? null,
        steps: segment.steps,
        direction: segment.direction,
        forward: segment.forward,
        crossesFloor,
        instruction: generateInstruction(segment, from, to, crossesFloor),
      }
    })

    return {
      ...route,
      routeFloors,
      pathsByFloor,
      segments,
      totalSteps: route.totalSteps,
      totalSegments: route.segments.length,
    }
  }

  function generateInstruction(segment, from, to, crossesFloor) {
    if (crossesFloor) {
      const floorChange = to.floor > from.floor ? 'up' : 'down'
      return `Go ${floorChange} to Floor ${to.floor}`
    }

    const dir = segment.forward ? segment.direction : getOppositeDirection(segment.direction)
    if (!dir) {
      return `Walk toward ${to?.name ?? 'destination'}`
    }

    const dirLabel = getDirectionLabel(dir)
    return `${dirLabel} toward ${to?.name ?? 'destination'}`
  }

  function getOppositeDirection(dir) {
    const opposites = {
      N: 'S', NE: 'SW', E: 'W', SE: 'NW',
      S: 'N', SW: 'NE', W: 'E', NW: 'SE',
    }
    return opposites[dir] ?? ''
  }

  function getDirectionLabel(dir) {
    const labels = {
      N: 'Go north', NE: 'Go northeast', E: 'Go east', SE: 'Go southeast',
      S: 'Go south', SW: 'Go southwest', W: 'Go west', NW: 'Go northwest',
    }
    return labels[dir] ?? 'Continue'
  }

  function getNodeName(nodeId) {
    const node = nodesById.get(nodeId)
    return node?.name ?? nodeId
  }

  function getNodeFloor(nodeId) {
    const node = nodesById.get(nodeId)
    return node?.floor ?? null
  }

  return {
    calculateRoute,
    getRouteDetails,
    getNodeName,
    getNodeFloor,
    nodesById,
  }
}

export function loadNavigationState() {
  try {
    const stored = localStorage.getItem(NAVIGATION_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
  }
  return null
}

export function saveNavigationState(state) {
  try {
    localStorage.setItem(NAVIGATION_STORAGE_KEY, JSON.stringify(state))
  } catch {
  }
}

export function clearNavigationState() {
  try {
    localStorage.removeItem(NAVIGATION_STORAGE_KEY)
  } catch {
  }
}

export function createNavigationState(destinationId, sourceId, route) {
  return {
    destinationId,
    sourceId,
    route,
    currentSegmentIndex: 0,
    isActive: false,
    startedAt: null,
    completedAt: null,
  }
}