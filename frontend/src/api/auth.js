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

/**
 * Sign in by redeeming an access code issued by the kiit-auth service.
 *
 * The code is the only thing the backend accepts. It resolves the code to the
 * roll number it is bound to, so there is no email field to send and no user
 * identity for the caller to claim.
 */
export async function authenticate(accessCode, signal) {
  const code = typeof accessCode === 'string' ? accessCode.trim() : ''

  const payload = await apiRequest(API_ENDPOINTS.auth, {
    method: 'POST',
    body: { code },
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
