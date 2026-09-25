import { LogIn, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthSession } from '../hooks/useAuthSession.js'
import { BottomNavigation, DesktopSidebar } from '../components/AppNavigation.jsx'
import BrandMark from '../components/BrandMark.jsx'
import PageTransition from '../components/PageTransition.jsx'

export default function AppLayout() {
  const { session } = useAuthSession()

  return (
    <div className="min-h-dvh bg-ink-950 text-slate-100">
      <DesktopSidebar />
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-white/8 bg-ink-950/90 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
            <div className="lg:hidden">
              <BrandMark />
            </div>
            <p className="hidden text-sm font-medium text-slate-400 lg:block">
              Indoor positioning for campus
            </p>
            <Link
              to={session ? '/account' : '/sign-in'}
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 text-sm font-semibold text-white active:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 sm:px-4"
            >
              {session ? (
                <UserRound size={18} aria-hidden="true" />
              ) : (
                <LogIn size={18} aria-hidden="true" />
              )}
              <span className="max-w-16 truncate sm:max-w-40">
                {session ? session.userId : 'Sign in'}
              </span>
            </Link>
          </div>
        </header>
        <PageTransition />
      </div>
      <BottomNavigation />
    </div>
  )
}
