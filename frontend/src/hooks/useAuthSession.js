import { useSyncExternalStore } from 'react'
import {
  clearAuthSession,
  getAuthSession,
  getAuthSessionEndReason,
  subscribeToAuthSession,
} from '../services/authSession.js'

function getServerSession() {
  return null
}

function getServerEndReason() {
  return null
}

export function useAuthSession() {
  const session = useSyncExternalStore(
    subscribeToAuthSession,
    getAuthSession,
    getServerSession,
  )
  const endReason = useSyncExternalStore(
    subscribeToAuthSession,
    getAuthSessionEndReason,
    getServerEndReason,
  )

  return {
    session,
    endReason,
    isAuthenticated: Boolean(session),
    signOut: clearAuthSession,
  }
}
