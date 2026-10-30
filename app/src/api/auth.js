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

/**
 * Sign in with a KIIT email and the backend's shared access key.
 *
 * The deployed backend still expects the email plus `access_key` sent together,
 * and derives the user id from the email. The key is read from the runtime
 * config so it can be entered on the Backend screen instead of being baked
 * into a build; a build with no key refuses before the request rather than
 * getting an opaque 401 from a server that was never told the secret.
 */
export async function authenticate(accessKey, signal) {
  const key = (accessKey || getApiAccessKey() || '').trim()

  if (!key) {
    throw new ApiError(
      'Enter the ibnIPS access code to sign in.',
      { code: MISSING_ACCESS_KEY_CODE },
    )
  }

  const payload = await apiRequest(API_ENDPOINTS.auth, {
    method: 'POST',
    body: { code: key },
    signal,
  })

  return parseAuthResponse(payload)
}