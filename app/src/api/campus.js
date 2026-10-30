import { apiRequest } from './client.js'
import { API_ENDPOINTS } from './endpoints.js'
import { sortNodes } from '../map/mapGraph.js'
import { parseMapResponse, parseNodeList } from '../map/mapContract.js'

/**
 * Spreads clustered backend coordinates across a consistent canvas while
 * preserving relative positions and directions. Backend data is untouched.
 */
function normalizeNodeCoordinates(nodes) {
  if (nodes.length === 0) return nodes

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (const node of nodes) {
    minX = Math.min(minX, node.x)
    maxX = Math.max(maxX, node.x)
    minY = Math.min(minY, node.y)
    maxY = Math.max(maxY, node.y)
  }

  const rangeX = maxX - minX || 1
  const rangeY = maxY - minY || 1

  // Scale up so nodes are well-spaced, preserving aspect ratio.
  const targetSize = 1000
  const padding = 80
  const scaleX = (targetSize - 2 * padding) / rangeX
  const scaleY = (targetSize - 2 * padding) / rangeY
  const scale = Math.min(scaleX, scaleY)

  return nodes.map((node) => ({
    ...node,
    x: Math.round((node.x - minX) * scale + padding),
    y: Math.round((node.y - minY) * scale + padding),
  }))
}

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

function countFingerprints(fingerprints) {
  const counts = {}

  for (const [nodeId, readings] of Object.entries(fingerprints)) {
    counts[nodeId] = readings.length
  }

  return counts
}

/**
 * Merges `/api/nodes` and `/api/map` into a single catalog.
 *
 * The nodes table is frequently empty on a fresh backend while `map.json`
 * already carries the graph, so map data wins and the database only fills gaps.
 * A failure in one endpoint degrades to `isPartial` instead of breaking the app.
 */
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

  // The backend hands us coordinates that are clustered too close together
  // (often single-digit deltas), which makes the map look congested and
  // zoomed in on a single node. Re-normalise on the client so the graph is
  // spread across a consistent canvas while preserving relative positions
  // and directions. Backend data is never modified.
  const normalizedNodes = normalizeNodeCoordinates([...nodesById.values()])

  const fingerprints = map ? map.fingerprints : {}

  return {
    nodes: sortNodes(normalizedNodes),
    edges: map ? map.edges : [],
    fingerprints,
    fingerprintCounts: countFingerprints(fingerprints),
    isPartial:
      nodesResult.status === 'rejected' || mapResult.status === 'rejected',
  }
}
