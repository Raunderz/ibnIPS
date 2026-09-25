const STORAGE_KEY = 'ibnips.recent.destinations'
const MAX_ITEMS = 8
const listeners = new Set()

let cachedItems = null

function isValidNode(value) {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    typeof value.nodeId === 'string' &&
    value.nodeId.length > 0 &&
    typeof value.name === 'string' &&
    Number.isInteger(value.floor) &&
    Number.isInteger(value.x) &&
    Number.isInteger(value.y)
  )
}

function toStoredNode(node) {
  return {
    nodeId: node.nodeId,
    name: node.name,
    floor: node.floor,
    x: node.x,
    y: node.y,
  }
}

function readStorage() {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY)

    if (!storedValue) {
      return []
    }

    const parsed = JSON.parse(storedValue)
    return Array.isArray(parsed) ? parsed.filter(isValidNode).slice(0, MAX_ITEMS) : []
  } catch {
    return []
  }
}

function writeStorage(items) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    return
  }
}

function notifyListeners() {
  for (const listener of listeners) {
    listener()
  }
}

export function getRecentDestinations() {
  if (cachedItems === null) {
    cachedItems = readStorage()
  }

  return cachedItems
}

export function recordRecentDestination(node) {
  if (!isValidNode(node)) {
    return
  }

  const item = toStoredNode(node)
  const remaining = getRecentDestinations().filter(
    (entry) => entry.nodeId !== item.nodeId,
  )
  cachedItems = [item, ...remaining].slice(0, MAX_ITEMS)
  writeStorage(cachedItems)
  notifyListeners()
}

export function clearRecentDestinations() {
  cachedItems = []
  writeStorage(cachedItems)
  notifyListeners()
}

export function subscribeToRecentDestinations(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
