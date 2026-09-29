import { useSyncExternalStore } from 'react'
import {
  clearAuthSession,
  getAuthSessionSnapshot,
  subscribeToAuthSession,
} from '../services/authSession.js'

export function useAuthSession() {
  const { session, endReason, hydrated } = useSyncExternalStore(
    subscribeToAuthSession,
    getAuthSessionSnapshot,
    getAuthSessionSnapshot,
  )

  return {
    session,
    endReason,
    isHydrated: hydrated,
    isAuthenticated: Boolean(session),
    signOut: clearAuthSession,
  }
}
