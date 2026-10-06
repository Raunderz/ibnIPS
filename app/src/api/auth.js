import { ApiError, apiRequest } from './client.js'
import { API_ENDPOINTS } from './endpoints.js'
import { getApiAccessKey } from './runtimeConfig.js'
import { parsePositionResponse } from '../positioning/positionContract.js'

const MISSING_ACCESS_KEY_CODE = 'missing_access_key'

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
  const accessKey = getApiAccessKey()

  // Checked before the request so the user gets the real cause instead of an
  // opaque 401 from a server that was never sent the key.
  if (!accessKey) {
    throw new ApiError(
      'This build has no ibnIPS access key, so it cannot sign in. Add the server key on the Backend screen.',
      { code: MISSING_ACCESS_KEY_CODE },
    )
  }

  const payload = await apiRequest(API_ENDPOINTS.auth, {
    method: 'POST',
    body: { email, access_key: accessKey },
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

/** The server rejects a request carrying more than this many readings. */
const MAX_POSITION_FINGERPRINTS = 200

/**
 * Asks the backend which room a live scan is in.
 *
 * This is the server-side counterpart to `matchFingerprints`. The server scores
 * rooms against every tagged visit and returns the best one even when the match
 * is weak, so the caller decides what counts as an answer.
 *
 * Readings are capped at the server's limit; the strongest ones are kept, since
 * dropping the weakest is what the server would otherwise reject the request
 * over.
 */
export async function locateRoom(readings, token, signal) {
  if (!token) {
    throw new TypeError('A bearer token is required to locate the user.')
  }

  const usable = (readings ?? [])
    .filter(
      (reading) =>
        typeof reading?.bssid === 'string' &&
        Number.isFinite(Number(reading.rssi)),
    )
    .sort((first, second) => Number(second.rssi) - Number(first.rssi))
    .slice(0, MAX_POSITION_FINGERPRINTS)
    .map((reading) => ({
      bssid: reading.bssid,
      ssid: typeof reading.ssid === 'string' ? reading.ssid : '',
      rssi: Number(reading.rssi),
    }))

  const payload = await apiRequest(API_ENDPOINTS.position, {
    method: 'POST',
    body: { fingerprints: usable },
    token,
    signal,
  })

  return parsePositionResponse(payload)
}
