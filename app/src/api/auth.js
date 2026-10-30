import { ApiError, apiRequest } from './client.js'
import { API_ENDPOINTS } from './endpoints.js'
import { getApiAccessKey } from './runtimeConfig.js'

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
 * Sign in by redeeming an access code issued by the kiit-auth service.
 *
 * The code is the only thing the backend accepts. It resolves the code to the
 * roll number it is bound to, so there is no email field to send and no user
 * identity for the caller to claim. A code can also be saved on the Backend
 * screen, which is the fallback when this screen is opened without one.
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