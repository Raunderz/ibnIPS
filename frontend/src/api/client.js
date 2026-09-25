import { clearAuthSession } from '../services/authSession.js'

const MISSING_BASE_URL_CODE = 'missing_api_base_url'
const DEV_PROXY_PREFIX = '/__ibnips'

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'request_failed', details = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export function getApiBaseUrl() {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL
  const trimmedUrl =
    typeof configuredUrl === 'string' ? configuredUrl.trim().replace(/\/+$/, '') : ''

  if (trimmedUrl) {
    return trimmedUrl
  }

  return import.meta.env.DEV ? DEV_PROXY_PREFIX : ''
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

  return new ApiError(
    typeof payload === 'string' ? payload : fallbackMessage,
    {
      status: response.status,
      code: `http_${response.status}`,
    },
  )
}

export async function apiRequest(path, options = {}) {
  const baseUrl = getApiBaseUrl()

  if (!baseUrl) {
    throw new ApiError('VITE_API_BASE_URL is not configured.', {
      code: MISSING_BASE_URL_CODE,
    })
  }

  const { method = 'GET', body, token, signal, headers: customHeaders } = options
  const headers = { Accept: 'application/json', ...customHeaders }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const requestPath = path.startsWith('/') ? path : `/${path}`

  let response

  try {
    response = await fetch(`${baseUrl}${requestPath}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error
    }

    throw new ApiError('Unable to reach the ibnIPS backend.', {
      code: 'network_error',
      details: error instanceof Error ? error.message : null,
    })
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
