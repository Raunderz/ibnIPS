import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = 'ibnips.recent.destinations'
const MAX_ITEMS = 8
const listeners = new Set()

let cachedItems = []
let hydrated = false
let hydrationPromise = null

let snapshot = []

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

function emit() {
  snapshot = cachedItems

  for (const listener of listeners) {
    listener()
  }
}

async function persist() {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cachedItems))
  } catch {
    // Recents stay in memory for this session.
  }
}

export function getRecentDestinationsSnapshot() {
  return snapshot
}

export function getRecentDestinations() {
  return cachedItems
}

export function hydrateRecentDestinations() {
  if (hydrated) {
    return Promise.resolve(cachedItems)
  }

  if (hydrationPromise) {
    return hydrationPromise
  }

  hydrationPromise = (async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY)

      if (stored) {
        const parsed = JSON.parse(stored)
        cachedItems = Array.isArray(parsed)
          ? parsed.filter(isValidNode).slice(0, MAX_ITEMS)
          : []
      }
    } catch {
      cachedItems = []
    } finally {
      hydrated = true
      emit()
    }

    return cachedItems
  })()

  return hydrationPromise
}

export function recordRecentDestination(node) {
  if (!isValidNode(node)) {
    return
  }

  const item = toStoredNode(node)
  const remaining = cachedItems.filter((entry) => entry.nodeId !== item.nodeId)
  cachedItems = [item, ...remaining].slice(0, MAX_ITEMS)
  void persist()
  emit()
}

export function clearRecentDestinations() {
  cachedItems = []
  void persist()
  emit()
}

export function subscribeToRecentDestinations(listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
