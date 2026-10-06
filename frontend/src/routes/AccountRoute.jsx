import RequireAuth from '../components/RequireAuth.jsx'
import AccountPage from '../pages/AccountPage.jsx'

export default function AccountRoute() {
  return (
    <RequireAuth>
      <AccountPage />
    </RequireAuth>
  )
}
