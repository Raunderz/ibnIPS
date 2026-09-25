import { CalendarClock, LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthSession } from '../hooks/useAuthSession.js'
import { formatDateTime } from '../utils/dateTime.js'

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
      <section className="rounded-[2rem] border border-white/8 bg-gradient-to-b from-brand-500/12 to-transparent p-5 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-300">
          Account
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] text-white sm:text-4xl">
          Session details
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          The token stays in this browser tab session and is sent only as a
          bearer credential to authenticated endpoints.
        </p>
      </section>

      <section className="overflow-hidden rounded-3xl border border-white/8 bg-white/4">
        <dl className="divide-y divide-white/8">
          <div className="flex items-center gap-4 p-5">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-400/12 text-brand-300">
              <UserRound size={21} aria-hidden="true" />
            </span>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                User ID
              </dt>
              <dd className="mt-1 font-mono text-sm text-white">
                {session.userId}
              </dd>
            </div>
          </div>
          <div className="flex items-center gap-4 p-5">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-400/12 text-brand-300">
              <CalendarClock size={21} aria-hidden="true" />
            </span>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Token expires
              </dt>
              <dd className="mt-1 text-sm text-white">
                {formatDateTime(session.expiresAt)}
              </dd>
            </div>
          </div>
          <div className="flex items-center gap-4 p-5">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-400/12 text-emerald-300">
              <ShieldCheck size={21} aria-hidden="true" />
            </span>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Token type
              </dt>
              <dd className="mt-1 text-sm text-white">HS256 bearer JWT</dd>
            </div>
          </div>
        </dl>
      </section>

      <button
        type="button"
        onClick={handleSignOut}
        className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-5 font-bold text-rose-200 active:bg-rose-400/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300 sm:w-auto"
      >
        <LogOut size={19} aria-hidden="true" />
        Sign out of this browser
      </button>
    </div>
  )
}
