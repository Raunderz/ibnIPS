import { useEffect, useSyncExternalStore } from 'react'
import {
  clearRecentDestinations,
  getRecentDestinationsSnapshot,
  hydrateRecentDestinations,
  recordRecentDestination,
  subscribeToRecentDestinations,
} from '../services/recentDestinations.js'

export function useRecentDestinations() {
  const items = useSyncExternalStore(
    subscribeToRecentDestinations,
    getRecentDestinationsSnapshot,
    getRecentDestinationsSnapshot,
  )

  useEffect(() => {
    void hydrateRecentDestinations()
  }, [])

  return { items, record: recordRecentDestination, clear: clearRecentDestinations }
}
