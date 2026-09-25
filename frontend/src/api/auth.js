import { apiRequest } from './client.js'
import { API_ENDPOINTS } from './endpoints.js'

function parseAuthResponse(payload) {
  if (
    !payload ||
    typeof payload !== 'object' ||
    typeof payload.token !== 'string' ||
    typeof payload.user_id !== 'string'
  ) {
    throw new TypeError('The authentication response is invalid.')
  }

  return {
    token: payload.token,
    userId: payload.user_id,
  }
}

export async function authenticate(email, signal) {
  const payload = await apiRequest(API_ENDPOINTS.auth, {
    method: 'POST',
    body: { email },
    signal,
  })

  return parseAuthResponse(payload)
}

export async function pingRoom(ping, token, signal) {
  if (!token) {
    throw new TypeError('A bearer token is required to tag a room.')
  }

  const payload = await apiRequest(API_ENDPOINTS.ping, {
    method: 'POST',
    body: ping,
    token,
    signal,
  })

  if (
    !payload ||
    typeof payload !== 'object' ||
    typeof payload.node_id !== 'string'
  ) {
    throw new TypeError('The ping response is invalid.')
  }

  return {
    status: payload.status,
    nodeId: payload.node_id,
  }
}
