import { useCallback, useSyncExternalStore } from 'react'
import {
  clearAuthSession,
  getAuthSession,
  subscribeToAuthSession,
} from '../services/authSession.js'

function getServerSnapshot() {
  return null
}

export function useAuthSession() {
  const session = useSyncExternalStore(
    subscribeToAuthSession,
    getAuthSession,
    getServerSnapshot,
  )
  const signOut = useCallback(() => {
    clearAuthSession()
  }, [])

  return {
    session,
    isAuthenticated: Boolean(session),
    signOut,
  }
}
