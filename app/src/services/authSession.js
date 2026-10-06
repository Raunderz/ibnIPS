import AsyncStorage from '@react-native-async-storage/async-storage'
import { decodeBase64UrlJson } from '../utils/base64.js'

const STORAGE_KEY = 'ibnips.auth.session'
const listeners = new Set()

let cachedSession = null
let cachedEndReason = null
let hydrated = false
let hydrationPromise = null

class SessionTokenError extends TypeError {
  constructor(message, code) {
    super(message)
    this.name = 'SessionTokenError'
    this.code = code
  }
}

function readExpiry(token) {
  const segments = typeof token === 'string' ? token.split('.') : []
  const payload = segments.length === 3 ? decodeBase64UrlJson(segments[1]) : null
  const expiry = Number(payload?.exp)

  return Number.isFinite(expiry) ? expiry * 1000 : null
}

function createSession(token, userId) {
  const expiresAt = readExpiry(token)

  if (expiresAt === null) {
    throw new SessionTokenError(
      'The backend returned a token without an expiry.',
      'invalid',
    )
  }

  if (expiresAt <= Date.now()) {
    throw new SessionTokenError(
      'The backend returned an expired token.',
      'expired',
    )
  }

  return { token, userId, expiresAt }
}

/**
 * A single stable object per state change. `useSyncExternalStore` compares
 * snapshots by identity, so rebuilding this on every read would loop forever.
 */
let snapshot = { session: null, endReason: null, hydrated: false }

function emit() {
  snapshot = {
    session: cachedSession,
    endReason: cachedEndReason,
    hydrated,
  }

  for (const listener of listeners) {
    listener()
  }
}

export function getAuthSessionSnapshot() {
  return snapshot
}

export function getAuthSession() {
  if (cachedSession && cachedSession.expiresAt <= Date.now()) {
    clearAuthSession('expired')
  }

  return cachedSession
}

export function getAuthSessionEndReason() {
  return cachedEndReason
}

export function isAuthHydrated() {
  return hydrated
}

async function persist(session) {
  try {
    if (session) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // Storage failures must never break sign-in; memory state still applies.
  }
}

/** Restores a persisted session. Runs once; repeat calls share the promise. */
export function hydrateAuthSession() {
  if (hydrated) {
    return Promise.resolve(cachedSession)
  }

  if (hydrationPromise) {
    return hydrationPromise
  }

  hydrationPromise = (async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY)

      if (stored) {
        const parsed = JSON.parse(stored)
        cachedSession = createSession(parsed.token, parsed.userId)
        scheduleExpiry(cachedSession)
      }
    } catch (error) {
      cachedSession = null
      cachedEndReason = error?.code === 'expired' ? 'expired' : 'invalid'
      void persist(null)
    } finally {
      hydrated = true
      emit()
    }

    return cachedSession
  })()

  return hydrationPromise
}

let expiryTimer = null

function scheduleExpiry(session) {
  if (expiryTimer) {
    clearTimeout(expiryTimer)
  }

  const delay = Math.max(0, session.expiresAt - Date.now())

  expiryTimer = setTimeout(() => {
    expiryTimer = null

    if (!cachedSession) {
      return
    }

    if (cachedSession.expiresAt > Date.now()) {
      scheduleExpiry(cachedSession)
      return
    }

    clearAuthSession('expired')
  }, delay)
}

export function saveAuthSession(token, userId) {
  const session = createSession(token, userId)

  cachedSession = session
  cachedEndReason = null
  hydrated = true
  scheduleExpiry(session)
  void persist(session)
  emit()

  return session
}

export function clearAuthSession(reason = 'signed-out') {
  cachedSession = null
  cachedEndReason = reason
  hydrated = true

  if (expiryTimer) {
    clearTimeout(expiryTimer)
    expiryTimer = null
  }

  void persist(null)
  emit()
}

export function subscribeToAuthSession(listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
