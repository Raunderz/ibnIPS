import { clearAuthSession } from '../services/authSession.js'
import { getApiBaseUrl } from './runtimeConfig.js'

const MISSING_BASE_URL_CODE = 'missing_api_base_url'
const DEFAULT_TIMEOUT_MS = 15_000

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'request_failed', details = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export function isApiConfigured() {
  return getApiBaseUrl().length > 0
}

function readPayload(response) {
  return response.text().then((text) => {
    if (!text) {
      return null
    }

    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  })
}

function createResponseError(response, payload) {
  if (payload && typeof payload === 'object' && typeof payload.error === 'string') {
    return new ApiError(payload.details || payload.error, {
      status: response.status,
      code: payload.error,
    })
  }

  const fallbackMessage = response.statusText || 'Backend request failed'

  return new ApiError(typeof payload === 'string' ? payload : fallbackMessage, {
    status: response.status,
    code: `http_${response.status}`,
  })
}

/**
 * Bridges a caller-supplied signal and a timeout into one controller.
 *
 * React Native's fetch has no default timeout, so without this a request to an
 * unreachable backend would leave spinners running indefinitely.
 */
function withTimeout(signal, timeoutMs) {
  const controller = new AbortController()
  let timedOut = false

  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  const abortFromCaller = () => controller.abort()

  if (signal) {
    if (signal.aborted) {
      controller.abort()
    } else {
      signal.addEventListener('abort', abortFromCaller)
    }
  }

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    dispose() {
      clearTimeout(timer)
      signal?.removeEventListener('abort', abortFromCaller)
    },
  }
}

export async function apiRequest(path, options = {}) {
  const baseUrl = getApiBaseUrl()

  if (!baseUrl) {
    throw new ApiError('No backend address is configured.', {
      code: MISSING_BASE_URL_CODE,
    })
  }

  const {
    method = 'GET',
    body,
    token,
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    headers: customHeaders,
  } = options

  const headers = { Accept: 'application/json', ...customHeaders }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const requestPath = path.startsWith('/') ? path : `/${path}`
  const timeout = withTimeout(signal, timeoutMs)

  let response

  try {
    response = await fetch(`${baseUrl}${requestPath}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: timeout.signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError') {
      if (timeout.didTimeout()) {
        throw new ApiError('The backend did not respond in time.', {
          code: 'timeout',
        })
      }

      throw error
    }

    throw new ApiError('Unable to reach the ibnIPS backend.', {
      code: 'network_error',
      details: error instanceof Error ? error.message : null,
    })
  } finally {
    timeout.dispose()
  }

  const payload = await readPayload(response)

  if (response.status === 401) {
    clearAuthSession('unauthorized')
  }

  if (!response.ok) {
    throw createResponseError(response, payload)
  }

  return payload
}
