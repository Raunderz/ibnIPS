const STORAGE_KEY = 'ibnips.auth.session'
const listeners = new Set()

let cachedSession = null
let expiryTimer = null
let storageRead = false

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

function createSession(token, userId) {
  const payload = decodeJwtPayload(token)
  const expiresAt = Number(payload?.exp) * 1000

  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    throw new TypeError('The backend returned an invalid or expired token.')
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
  } catch {
    removeStoredSession()
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

export function saveAuthSession(token, userId) {
  const session = createSession(token, userId)
  cachedSession = session
  storageRead = true
  persistSession(session)
  scheduleExpiry(session)
  notifyListeners()
  return session
}

export function clearAuthSession() {
  cachedSession = null
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
