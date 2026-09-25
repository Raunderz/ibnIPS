import { CalendarClock, LogOut, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthSession } from '../hooks/useAuthSession.js'
import { formatDateTime } from '../utils/dateTime.js'
import { getUserInitials } from '../utils/location.js'

export default function AccountPage() {
  const { session, signOut } = useAuthSession()
  const navigate = useNavigate()

  function handleSignOut() {
    signOut()
    navigate('/', { replace: true })
  }

  if (!session) {
    return null
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-white">
          Account
        </h1>
        <p className="mt-2 text-[15px] leading-6 text-slate-400">
          Your session for this browser tab. ibnIPS only needs a token for
          authenticated endpoints.
        </p>
      </section>

      <section className="rounded-card border border-white/8 bg-ink-850 p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-500 text-[15px] font-extrabold text-ink-950">
            {getUserInitials(session.userId)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-white">
              {session.userId}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Active session</p>
          </div>
        </div>
      </section>

      <dl className="space-y-2">
        <div className="flex min-h-14 items-center gap-3 rounded-2xl bg-ink-850 px-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/5 text-slate-300">
            <CalendarClock size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <dt className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
              Token expires
            </dt>
            <dd className="mt-0.5 truncate text-sm font-semibold text-white">
              {formatDateTime(session.expiresAt)}
            </dd>
          </div>
        </div>
        <div className="flex min-h-14 items-center gap-3 rounded-2xl bg-ink-850 px-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300">
            <ShieldCheck size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <dt className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
              Token type
            </dt>
            <dd className="mt-0.5 text-sm font-semibold text-white">
              HS256 bearer JWT, stored in this tab only
            </dd>
          </div>
        </div>
      </dl>

      <button
        type="button"
        onClick={handleSignOut}
        className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-5 text-[15px] font-bold text-rose-200 transition-colors active:bg-rose-400/20"
      >
        <LogOut size={19} aria-hidden="true" />
        Sign out of this browser
      </button>
    </div>
  )
}
