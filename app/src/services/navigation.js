import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  findRoute,
  getNodesById,
  getRouteFloors,
  getRoutePathsByFloor,
} from '../map/mapGraph.js'

const NAVIGATION_STORAGE_KEY = 'ibnips.navigation.state'

const OPPOSITE_DIRECTIONS = {
  N: 'S',
  NE: 'SW',
  E: 'W',
  SE: 'NW',
  S: 'N',
  SW: 'NE',
  W: 'E',
  NW: 'SE',
}

const DIRECTION_LABELS = {
  N: 'Go north',
  NE: 'Go northeast',
  E: 'Go east',
  SE: 'Go southeast',
  S: 'Go south',
  SW: 'Go southwest',
  W: 'Go west',
  NW: 'Go northwest',
}

export function createNavigationService(nodes, edges) {
  const nodesById = getNodesById(nodes)

  function calculateRoute(fromNodeId, toNodeId) {
    if (!fromNodeId || !toNodeId) {
      return null
    }

    return findRoute(edges, fromNodeId, toNodeId)
  }

  function generateInstruction(segment, from, to, crossesFloor) {
    if (crossesFloor) {
      return `Go ${to.floor > from.floor ? 'up' : 'down'} to Floor ${to.floor}`
    }

    const direction = segment.forward
      ? segment.direction
      : (OPPOSITE_DIRECTIONS[segment.direction] ?? '')

    if (!direction) {
      return `Walk toward ${to?.name ?? 'your destination'}`
    }

    return `${DIRECTION_LABELS[direction] ?? 'Continue'} toward ${to?.name ?? 'your destination'}`
  }

  function getRouteDetails(route) {
    if (!route) {
      return null
    }

    const segments = route.segments.map((segment, index) => {
      const from = nodesById.get(segment.fromNodeId)
      const to = nodesById.get(segment.toNodeId)
      const crossesFloor = Boolean(from && to && from.floor !== to.floor)

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
      routeFloors: getRouteFloors(route, nodesById),
      pathsByFloor: getRoutePathsByFloor(route, nodesById),
      segments,
      totalSteps: route.totalSteps,
      totalSegments: segments.length,
    }
  }

  return {
    calculateRoute,
    getRouteDetails,
    getNodeName: (nodeId) => nodesById.get(nodeId)?.name ?? nodeId,
    getNodeFloor: (nodeId) => nodesById.get(nodeId)?.floor ?? null,
    nodesById,
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

export async function loadNavigationState() {
  try {
    const stored = await AsyncStorage.getItem(NAVIGATION_STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

export async function saveNavigationState(state) {
  try {
    await AsyncStorage.setItem(NAVIGATION_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Navigation continues in memory.
  }
}

export async function clearNavigationState() {
  try {
    await AsyncStorage.removeItem(NAVIGATION_STORAGE_KEY)
  } catch {
    // Nothing to do.
  }
}
