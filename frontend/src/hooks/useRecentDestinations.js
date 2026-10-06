import { useSyncExternalStore } from 'react'
import {
  clearRecentDestinations,
  getRecentDestinations,
  recordRecentDestination,
  subscribeToRecentDestinations,
} from '../services/recentDestinations.js'

function getServerItems() {
  return []
}

export function useRecentDestinations() {
  const items = useSyncExternalStore(
    subscribeToRecentDestinations,
    getRecentDestinations,
    getServerItems,
  )

  return {
    items,
    record: recordRecentDestination,
    clear: clearRecentDestinations,
  }
}
