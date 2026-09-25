import {
  ArrowRight,
  Database,
  MapPinned,
  RadioTower,
  Route,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import BackendStatusCard from '../components/BackendStatusCard.jsx'
import { useAuthSession } from '../hooks/useAuthSession.js'

const contractCards = [
  {
    title: 'Indoor graph',
    endpoint: 'GET /api/map',
    description: 'Nodes, directed edges, and optional Wi-Fi fingerprints.',
    icon: MapPinned,
  },
  {
    title: 'Session access',
    endpoint: 'POST /api/auth',
    description: 'KIIT email exchange for a 24-hour bearer token.',
    icon: RadioTower,
  },
  {
    title: 'Room tagging',
    endpoint: 'POST /api/ping',
    description: 'Authenticated room and fingerprint submission for later phases.',
    icon: Database,
  },
]

export default function HomePage() {
  const { isAuthenticated } = useAuthSession()

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] border border-white/8 bg-gradient-to-b from-brand-500/12 via-white/5 to-transparent p-5 sm:p-8 lg:p-10">
        <p className="inline-flex min-h-8 items-center rounded-full border border-brand-400/25 bg-brand-400/10 px-3 text-xs font-bold uppercase tracking-[0.16em] text-brand-200">
          Web foundation
        </p>
        <h1 className="mt-5 max-w-2xl text-4xl font-black leading-[1.05] tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
          Navigate indoors with ibnIPS.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
          ibnIPS uses ambient Wi-Fi fingerprints and a room graph to support
          indoor positioning. This mobile-first client is being built directly
          against the deployed backend contract.
        </p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2 sm:max-w-lg">
          <Link
            to={isAuthenticated ? '/account' : '/sign-in'}
            className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-brand-400 px-5 font-bold text-ink-950 active:bg-brand-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-200"
          >
            {isAuthenticated ? 'Open account' : 'Sign in with KIIT email'}
            <ArrowRight size={19} aria-hidden="true" />
          </Link>
          <Link
            to="/map"
            className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/5 px-5 font-bold text-white active:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
          >
            View map status
          </Link>
        </div>
      </section>

      <section aria-labelledby="backend-status-heading">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2
            id="backend-status-heading"
            className="text-lg font-bold tracking-tight text-white"
          >
            Backend status
          </h2>
          <span className="text-xs font-semibold text-slate-500">GET /</span>
        </div>
        <BackendStatusCard />
      </section>

      <section aria-labelledby="contract-heading">
        <div className="mb-3">
          <h2
            id="contract-heading"
            className="text-lg font-bold tracking-tight text-white"
          >
            Verified API foundation
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            Only endpoints implemented by the backend are wired into the client.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {contractCards.map(({ title, endpoint, description, icon: Icon }) => (
            <article
              key={endpoint}
              className="rounded-3xl border border-white/8 bg-white/4 p-5"
            >
              <span className="grid size-11 place-items-center rounded-2xl bg-brand-400/12 text-brand-300">
                <Icon size={21} aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-bold text-white">{title}</h3>
              <p className="mt-1 font-mono text-xs text-brand-300">{endpoint}</p>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-white/8 bg-white/4 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-400/12 text-amber-300">
            <Route size={21} aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-bold text-white">Scope of this phase</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              The API contract, routing, design tokens, and application shell
              are ready. Map rendering, client-side pathfinding, and current
              location are intentionally not implemented yet.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
