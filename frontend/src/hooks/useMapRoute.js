import { useMemo } from 'react'
import {
  findRoute,
  getNodesById,
  getRouteFloors,
  getRouteNodeSet,
} from '../map/mapGraph.js'

export function useMapRoute(nodes, edges, fromNodeId, toNodeId, options) {
  return useMemo(() => {
    const empty = {
      route: null,
      routeFloors: [],
      routeNodeSet: new Set(),
      isReachable: false,
    }

    if (!fromNodeId || !toNodeId) {
      return empty
    }

    const route = findRoute(edges, fromNodeId, toNodeId, options)

    if (!route) {
      return empty
    }

    return {
      route,
      routeFloors: getRouteFloors(route, getNodesById(nodes)),
      routeNodeSet: getRouteNodeSet(route),
      isReachable: true,
    }
  }, [nodes, edges, fromNodeId, toNodeId, options])
}
