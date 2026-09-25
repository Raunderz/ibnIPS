import { Home, Map, UserRound } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const navigationItems = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/map', label: 'Map', icon: Map, end: false },
  { to: '/account', label: 'Account', icon: UserRound, end: false },
]

function getLinkClass({ isActive }) {
  return [
    'flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400',
    isActive
      ? 'bg-brand-500/15 text-brand-200'
      : 'text-slate-400 active:bg-white/5 active:text-white',
  ].join(' ')
}

export function DesktopSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-white/8 bg-ink-950/95 px-4 py-6 backdrop-blur lg:flex lg:flex-col">
      <div className="px-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Navigation
        </p>
      </div>
      <nav className="mt-4 flex flex-col gap-2" aria-label="Primary navigation">
        {navigationItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={getLinkClass}
          >
            <Icon size={20} strokeWidth={2} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto rounded-2xl border border-white/8 bg-white/4 p-4">
        <p className="text-sm font-semibold text-white">Foundation phase</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          Map rendering and navigation arrive in a later phase.
        </p>
      </div>
    </aside>
  )
}

export function BottomNavigation() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-ink-950/95 px-2 pt-2 backdrop-blur-xl lg:hidden"
      aria-label="Primary navigation"
    >
      <div className="mx-auto grid max-w-md grid-cols-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {navigationItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              [
                'flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-400',
                isActive ? 'text-brand-300' : 'text-slate-500',
              ].join(' ')
            }
          >
            <Icon size={21} strokeWidth={2} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
