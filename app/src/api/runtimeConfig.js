import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = 'ibnips.api.baseUrl'

/**
 * Used when no environment variable and no saved override exist, so a fresh
 * clone talks to the deployed backend without any setup.
 */
export const FALLBACK_BASE_URL = 'https://ibnips.onrender.com'

let overrideBaseUrl = null
let hydrated = false
let hydratedWaiters = []
const configListeners = new Set()

/**
 * `EXPO_PUBLIC_*` variables are inlined by the Expo babel preset, so this must
 * be read as a static property access rather than a dynamic lookup.
 */
function readEnvBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL
  return typeof configured === 'string' ? configured.trim() : ''
}

export function normalizeBaseUrl(value) {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()

  if (!trimmed) {
    return null
  }

  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
  const isHttp = /^https?:\/\//i.test(trimmed)

  // Reject an unsupported scheme outright. Without this, "ftp://host" would be
  // prefixed to "http://" and quietly become the nonsense host "ftp".
  if (hasScheme && !isHttp) {
    return null
  }

  const withProtocol = isHttp ? trimmed : `http://${trimmed}`

  let parsed

  try {
    parsed = new URL(withProtocol)
  } catch {
    return null
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null
  }

  if (!parsed.hostname) {
    return null
  }

  // Endpoints are absolute paths such as /api/map, so only the origin is kept.
  return `${parsed.protocol}//${parsed.host}`.replace(/\/+$/, '')
}

export function getApiBaseUrl() {
  return (
    overrideBaseUrl || normalizeBaseUrl(readEnvBaseUrl()) || FALLBACK_BASE_URL
  )
}

export function getApiBaseUrlSource() {
  if (overrideBaseUrl) {
    return 'override'
  }

  return normalizeBaseUrl(readEnvBaseUrl()) ? 'env' : 'fallback'
}

export function isApiConfigHydrated() {
  return hydrated
}

/** Reads the saved override once at startup. Safe to call more than once. */
export async function hydrateApiConfig() {
  if (hydrated) {
    return getApiBaseUrl()
  }

  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY)
    overrideBaseUrl = normalizeBaseUrl(stored)
  } catch {
    overrideBaseUrl = null
  }

  hydrated = true

  for (const waiter of hydratedWaiters) {
    waiter()
  }

  hydratedWaiters = []

  return getApiBaseUrl()
}

export function whenApiConfigHydrated() {
  if (hydrated) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    hydratedWaiters.push(resolve)
  })
}

/**
 * Persists a base URL chosen at runtime, which is what makes it possible to
 * point a physical phone at a laptop on the same Wi-Fi without a rebuild.
 */
function emitConfigChange() {
  for (const listener of configListeners) {
    listener()
  }
}

export function subscribeToApiConfig(listener) {
  configListeners.add(listener)
  return () => {
    configListeners.delete(listener)
  }
}

export async function setApiBaseUrlOverride(value) {
  const normalized = normalizeBaseUrl(value)
  await hydrateApiConfig()

  if (normalized === null) {
    throw new TypeError('Enter a valid http:// or https:// address.')
  }

  overrideBaseUrl = normalized

  try {
    await AsyncStorage.setItem(STORAGE_KEY, normalized)
  } catch {
    // An in-memory override is still useful for this session.
  }

  emitConfigChange()

  return normalized
}

export async function clearApiBaseUrlOverride() {
  await hydrateApiConfig()
  overrideBaseUrl = null

  try {
    await AsyncStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing else to do.
  }

  emitConfigChange()

  return getApiBaseUrl()
}
