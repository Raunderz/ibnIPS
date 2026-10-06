import { clearAuthSession } from '../services/authSession.js'

const MISSING_BASE_URL_CODE = 'missing_api_base_url'
const INVALID_BODY_CODE = 'invalid_response_body'
const DEV_PROXY_PREFIX = '/__ibnips'
const DEFAULT_TIMEOUT_MS = 30_000

const HTML_SNIFF = /^\s*(?:<!doctype|<html|<\?xml|<)/i

function readConfiguredTimeout() {
  const raw = Number(import.meta.env.VITE_API_TIMEOUT_MS)
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TIMEOUT_MS
}

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

function createInvalidBodyError(response, text) {
  const looksLikeHtml = HTML_SNIFF.test(text)

  return new ApiError(
    looksLikeHtml
      ? 'The backend address returned a web page instead of ibnIPS data. Check the API base URL and any CORS proxy.'
      : 'The backend returned a response ibnIPS could not read.',
    {
      status: response.status,
      code: INVALID_BODY_CODE,
      details: text.slice(0, 120),
    },
  )
}

function readPayload(response) {
  return response.text().then(
    (text) => {
      if (!text) {
        return null
      }

      try {
        return JSON.parse(text)
      } catch {
        // A JSON endpoint never legitimately answers with a document, so an
        // HTML page here means a proxy interstitial, a login wall or a 404
        // from the wrong host. Passing it on would poison every contract
        // parser downstream, so fail loudly with a readable reason instead.
        if (HTML_SNIFF.test(text)) {
          throw createInvalidBodyError(response, text)
        }

        return text
      }
    },
    () => null,
  )
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

function createLinkedAbortController(signal, timeoutMs) {
  const controller = new AbortController()
  let didTimeout = false

  const timer = setTimeout(() => {
    didTimeout = true
    controller.abort()
  }, timeoutMs)

  function handleExternalAbort() {
    controller.abort()
  }

  if (signal) {
    if (signal.aborted) {
      controller.abort()
    } else {
      signal.addEventListener('abort', handleExternalAbort, { once: true })
    }
  }

  return {
    signal: controller.signal,
    didTimeout: () => didTimeout,
    dispose() {
      clearTimeout(timer)
      signal?.removeEventListener('abort', handleExternalAbort)
    },
  }
}

export async function apiRequest(path, options = {}) {
  const baseUrl = getApiBaseUrl()

  if (!baseUrl) {
    throw new ApiError('VITE_API_BASE_URL is not configured.', {
      code: MISSING_BASE_URL_CODE,
    })
  }

  const {
    method = 'GET',
    body,
    token,
    signal,
    timeout = readConfiguredTimeout(),
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
  const abort = createLinkedAbortController(signal, timeout)

  try {
    let response

    try {
      response = await fetch(`${baseUrl}${requestPath}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: abort.signal,
      })
    } catch (error) {
      if (abort.didTimeout()) {
        throw new ApiError('The backend took too long to respond.', {
          code: 'request_timeout',
        })
      }

      if (error?.name === 'AbortError') {
        throw error
      }

      throw new ApiError('Unable to reach the ibnIPS backend.', {
        code: 'network_error',
        details: error instanceof Error ? error.message : null,
      })
    }

    const payload = await readPayload(response)

    // Only drop the session when the rejection actually came from a request
    // that carried the token. Public endpoints can answer 401 on their own
    // (a proxy login wall, a sleeping cold start), and logging the user out
    // for those caused a redirect loop between /account and /login.
    if (response.status === 401 && token) {
      clearAuthSession('unauthorized')
    }

    if (!response.ok) {
      throw createResponseError(response, payload)
    }

    return payload
  } finally {
    abort.dispose()
  }
}
