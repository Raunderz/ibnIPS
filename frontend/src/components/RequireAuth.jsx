import { Navigate, useLocation } from 'react-router-dom'
import { useAuthSession } from '../hooks/useAuthSession.js'

export default function RequireAuth({ children }) {
  const { isAuthenticated } = useAuthSession()
  const location = useLocation()

  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}`
    return (
      <Navigate
        to={`/sign-in?returnTo=${encodeURIComponent(returnTo)}`}
        replace
      />
    )
  }

  return children
}
