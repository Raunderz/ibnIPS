import { Home, Map as MapIcon, Search, UserRound } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import BrandMark from './BrandMark.jsx'
import { useAuthSession } from '../hooks/useAuthSession.js'
import { getUserInitials } from '../utils/location.js'

const tabItems = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/search', label: 'Search', icon: Search, end: false },
  { to: '/map', label: 'Map', icon: MapIcon, end: false },
  { to: '/account', label: 'Account', icon: UserRound, end: false },
]

function getDesktopLinkClass({ isActive }) {
  return [
    'inline-flex min-h-11 items-center rounded-2xl px-3 text-sm font-semibold transition-colors duration-150',
    isActive
      ? 'bg-white/8 text-white'
      : 'text-slate-400 hover:text-white focus-visible:text-white',
  ].join(' ')
}

export function AppTopBar() {
  const { session } = useAuthSession()

  return (
    <header className="sticky top-0 z-30 border-b border-white/8 bg-ink-950/88 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-xl items-center gap-2">
        <BrandMark showTagline />
        <nav
          className="ml-auto hidden items-center gap-1 lg:flex"
          aria-label="Primary navigation"
        >
          {tabItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={getDesktopLinkClass}
            >
              <Icon size={17} className="mr-2" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <Link
          to={session ? '/account' : '/login'}
          aria-label={session ? 'Open account' : 'Sign in'}
          className="ml-auto grid size-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/5 text-[13px] font-bold text-white transition-colors duration-150 active:bg-white/10 lg:ml-0"
        >
          {session ? getUserInitials(session.userId) : <UserRound size={19} />}
        </Link>
      </div>
    </header>
  )
}

export function BottomTabBar() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/8 bg-ink-950/94 backdrop-blur-xl lg:hidden"
      aria-label="Primary navigation"
    >
      <div className="mx-auto grid max-w-xl grid-cols-4 px-1 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              [
                'flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-semibold transition-colors duration-150',
                isActive ? 'text-brand-300' : 'text-slate-500',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`size-1 rounded-full transition-opacity duration-150 ${
                    isActive ? 'bg-brand-400 opacity-100' : 'opacity-0'
                  }`}
                  aria-hidden="true"
                />
                <Icon size={21} aria-hidden="true" />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
