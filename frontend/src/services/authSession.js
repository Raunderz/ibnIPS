const STORAGE_KEY = 'ibnips.auth.session'
const listeners = new Set()

let cachedSession = null
let cachedEndReason = null
let expiryTimer = null
let storageRead = false

class SessionTokenError extends TypeError {
  constructor(message, code) {
    super(message)
    this.name = 'SessionTokenError'
    this.code = code
  }
}

function decodeJwtPayload(token) {
  const segments = token.split('.')
  const payload = segments[1]

  if (!payload) {
    return null
  }

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    return JSON.parse(window.atob(padded))
  } catch {
    return null
  }
}

function readExpiry(token) {
  const payload = decodeJwtPayload(token)
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

  return {
    token,
    userId,
    expiresAt,
  }
}

function removeStoredSession() {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    return
  }
}

function persistSession(session) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    return
  }
}

function readStorage() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const storedValue = window.sessionStorage.getItem(STORAGE_KEY)

    if (!storedValue) {
      return null
    }

    const parsed = JSON.parse(storedValue)
    return createSession(parsed.token, parsed.userId)
  } catch (error) {
    removeStoredSession()
    cachedEndReason = error?.code === 'expired' ? 'expired' : 'invalid'
    return null
  }
}

function notifyListeners() {
  for (const listener of listeners) {
    listener()
  }
}

function scheduleExpiry(session) {
  window.clearTimeout(expiryTimer)
  const delay = Math.max(0, session.expiresAt - Date.now())

  expiryTimer = window.setTimeout(() => {
    if (!cachedSession) {
      return
    }

    if (cachedSession.expiresAt > Date.now()) {
      scheduleExpiry(cachedSession)
      return
    }

    cachedSession = null
    cachedEndReason = 'expired'
    expiryTimer = null
    removeStoredSession()
    notifyListeners()
  }, delay)
}

export function getAuthSession() {
  if (!storageRead) {
    storageRead = true
    cachedSession = readStorage()

    if (cachedSession) {
      scheduleExpiry(cachedSession)
    }
  }

  if (cachedSession && cachedSession.expiresAt <= Date.now()) {
    return null
  }

  return cachedSession
}

export function getAuthSessionEndReason() {
  return cachedEndReason
}

export function saveAuthSession(token, userId) {
  const session = createSession(token, userId)
  cachedSession = session
  cachedEndReason = null
  storageRead = true
  persistSession(session)
  scheduleExpiry(session)
  notifyListeners()
  return session
}

export function clearAuthSession(reason = 'signed-out') {
  cachedSession = null
  cachedEndReason = reason
  storageRead = true
  window.clearTimeout(expiryTimer)
  expiryTimer = null
  removeStoredSession()
  notifyListeners()
}

export function subscribeToAuthSession(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
