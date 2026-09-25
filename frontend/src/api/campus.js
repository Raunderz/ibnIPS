import { apiRequest } from './client.js'
import { API_ENDPOINTS } from './endpoints.js'
import { parseMapResponse } from '../map/mapContract.js'

export async function getBackendHealth(signal) {
  const payload = await apiRequest(API_ENDPOINTS.health, { signal })

  if (typeof payload !== 'string') {
    throw new TypeError('The backend health response is invalid.')
  }

  return payload.trim()
}

export async function getNodes(signal) {
  const payload = await apiRequest(API_ENDPOINTS.nodes, { signal })

  if (!Array.isArray(payload)) {
    throw new TypeError('The nodes response is invalid.')
  }

  return payload
}

export async function getMap(signal) {
  const payload = await apiRequest(API_ENDPOINTS.map, { signal })
  return parseMapResponse(payload)
}
