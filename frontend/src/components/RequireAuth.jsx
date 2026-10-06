import { Navigate, useLocation } from 'react-router-dom'
import { useAuthSession } from '../hooks/useAuthSession.js'

export default function RequireAuth({ children }) {
  const { isAuthenticated, endReason } = useAuthSession()
  const location = useLocation()

  if (!isAuthenticated) {
    const params = new URLSearchParams({
      returnTo: `${location.pathname}${location.search}`,
    })

    if (endReason === 'expired' || endReason === 'unauthorized') {
      params.set('reason', endReason)
    }

    return <Navigate to={`/login?${params.toString()}`} replace />
  }

  return children
}
