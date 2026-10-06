import { apiRequest } from './client.js'
import { API_ENDPOINTS } from './endpoints.js'
import { isPositioned, sortNodes } from '../map/mapGraph.js'
import { parseMapResponse, parseNodeList } from '../map/mapContract.js'

const HEALTH_MAX_LENGTH = 200
const HEALTH_NOISE = /(?:error|forbidden|denied|proxy|unavailable|not found|sign in|log in|captcha|cloudflare)/i

function isAbortError(error) {
  return error?.name === 'AbortError' || error?.code === 'request_aborted'
}

/**
 * Grid fallback for rooms the backend has no coordinates for yet. Returns new
 * objects instead of writing into the cached nodes so the query cache keeps
 * exactly what the backend said.
 */
function withFallbackPositions(nodes) {
  const unpositioned = nodes.filter((node) => !isPositioned(node))

  if (unpositioned.length === 0) {
    return nodes
  }

  const placed = new Set(unpositioned)
  const columns = Math.max(1, Math.ceil(Math.sqrt(unpositioned.length)))
  const spacing = 160
  let index = 0

  return nodes.map((node) => {
    if (!placed.has(node)) {
      return node
    }

    const column = index % columns
    const row = Math.floor(index / columns)
    index += 1

    return {
      ...node,
      x: column * spacing + 80,
      y: row * spacing + 80,
    }
  })
}

function describeError(error) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'The campus catalog could not be loaded.'
}

/**
 * Merge the two public sources into the one catalog the UI renders.
 *
 * `fingerprints` is a keyed object, so it has to be walked with Object.entries.
 * Iterating it directly threw "object is not iterable" and that single line
 * failed every screen the moment /api/map answered successfully.
 */
export function buildCatalogFromSources(databaseNodes = [], map = null, issues = []) {
  const nodesById = new Map()

  for (const node of map?.nodes ?? []) {
    nodesById.set(node.nodeId, node)
  }

  for (const node of databaseNodes ?? []) {
    if (!nodesById.has(node.nodeId)) {
      nodesById.set(node.nodeId, node)
    }
  }

  const fingerprintCounts = {}

  for (const [nodeId, readings] of Object.entries(map?.fingerprints ?? {})) {
    fingerprintCounts[nodeId] = Array.isArray(readings) ? readings.length : 0
  }

  return {
    nodes: withFallbackPositions(sortNodes([...nodesById.values()])),
    edges: map?.edges ?? [],
    fingerprintCounts,
    // One source answering is still a usable campus map, so a single failure
    // degrades to partial data instead of blanking the whole app.
    isPartial: issues.length > 0,
    issues,
  }
}

async function settle(loader) {
  try {
    return { data: await loader(), error: null }
  } catch (error) {
    return { data: null, error }
  }
}

export async function getBackendHealth(signal) {
  const payload = await apiRequest(API_ENDPOINTS.health, { signal })

  if (typeof payload !== 'string') {
    throw new TypeError('The backend health response is invalid.')
  }

  const message = payload.trim()

  // A reachable proxy is not a reachable backend. Public CORS relays answer
  // health checks with a rate-limit notice or an unlock page, which used to
  // paint a green "Backend online" chip while every other screen failed.
  if (!message || message.length > HEALTH_MAX_LENGTH || HEALTH_NOISE.test(message)) {
    throw new TypeError('The backend address did not answer as ibnIPS.')
  }

  return message
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
  const [nodesResult, mapResult] = await Promise.all([
    settle(() => getNodes(signal)),
    settle(() => getMap(signal)),
  ])

  // A cancelled request must keep cancelling, otherwise an in-flight refresh
  // lands as a half-empty catalog and wipes the map the user is looking at.
  for (const result of [nodesResult, mapResult]) {
    if (isAbortError(result.error)) {
      throw result.error
    }
  }

  // Nothing came back at all. That is a real outage, so let react-query own
  // it and the pages can render their retry state.
  if (nodesResult.data === null && mapResult.data === null) {
    throw nodesResult.error ?? mapResult.error
  }

  const databaseNodes = nodesResult.data ?? []
  const issues = [nodesResult.error, mapResult.error]
    .filter(Boolean)
    .map(describeError)

  return buildCatalogFromSources(databaseNodes, mapResult.data, issues)
}