import { apiRequest } from './client.js'
import { API_ENDPOINTS } from './endpoints.js'
import { sortNodes } from '../map/mapGraph.js'
import { parseMapResponse, parseNodeList } from '../map/mapContract.js'

export async function getBackendHealth(signal) {
  const payload = await apiRequest(API_ENDPOINTS.health, { signal })

  if (typeof payload !== 'string') {
    throw new TypeError('The backend health response is invalid.')
  }

  return payload.trim()
}

export async function getNodes(signal) {
  const payload = await apiRequest(API_ENDPOINTS.nodes, { signal })
  return parseNodeList(payload)
}

export async function getMap(signal) {
  const payload = await apiRequest(API_ENDPOINTS.map, { signal })
  return parseMapResponse(payload)
}

export async function getCampusCatalog(signal) {
  const [nodesResult, mapResult] = await Promise.allSettled([
    getNodes(signal),
    getMap(signal),
  ])

  if (nodesResult.status === 'rejected' && mapResult.status === 'rejected') {
    throw nodesResult.reason
  }

  const databaseNodes = nodesResult.status === 'fulfilled' ? nodesResult.value : []
  const map = mapResult.status === 'fulfilled' ? mapResult.value : null
  const nodesById = new Map()

  for (const node of map ? map.nodes : []) {
    nodesById.set(node.nodeId, node)
  }

  for (const node of databaseNodes) {
    if (!nodesById.has(node.nodeId)) {
      nodesById.set(node.nodeId, node)
    }
  }

  return {
    nodes: sortNodes([...nodesById.values()]),
    edges: map ? map.edges : [],
    fingerprintCounts: getFingerprintCounts(map),
    isPartial:
      nodesResult.status === 'rejected' || mapResult.status === 'rejected',
  }
}

function getFingerprintCounts(map) {
  const counts = {}

  for (const [nodeId, readings] of map?.fingerprints ?? []) {
    counts[nodeId] = readings.length
  }

  return counts
}
