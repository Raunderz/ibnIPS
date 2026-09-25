import { ArrowLeft, Layers3, Route } from 'lucide-react'
import { Link } from 'react-router-dom'

const readyContracts = [
  'Nodes with node_id, name, floor, x, and y',
  'Directed edges with steps and compass direction',
  'Optional fingerprints grouped by node_id',
]

export default function MapPage() {
  return (
    <div className="space-y-6">
      <Link
        to="/"
        className="inline-flex min-h-12 items-center gap-2 rounded-2xl pr-3 text-sm font-semibold text-slate-300 active:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
      >
        <ArrowLeft size={19} aria-hidden="true" />
        Home
      </Link>

      <section className="rounded-[2rem] border border-white/8 bg-gradient-to-b from-brand-500/10 to-transparent p-5 sm:p-8">
        <p className="inline-flex min-h-8 items-center rounded-full border border-amber-400/25 bg-amber-400/10 px-3 text-xs font-bold uppercase tracking-[0.16em] text-amber-200">
          Planned interface
        </p>
        <h1 className="mt-5 text-3xl font-black tracking-[-0.03em] text-white sm:text-4xl">
          Indoor map
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">
          The map view is not enabled in this foundation phase. The client can
          already validate the real map payload without inventing campus data.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-3xl border border-white/8 bg-white/4 p-5">
          <span className="grid size-11 place-items-center rounded-2xl bg-brand-400/12 text-brand-300">
            <Layers3 size={21} aria-hidden="true" />
          </span>
          <h2 className="mt-4 font-bold text-white">Map contract ready</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-400">
            {readyContracts.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden="true" className="text-brand-400">
                  •
                </span>
                {item}
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-3xl border border-white/8 bg-white/4 p-5">
          <span className="grid size-11 place-items-center rounded-2xl bg-amber-400/12 text-amber-300">
            <Route size={21} aria-hidden="true" />
          </span>
          <h2 className="mt-4 font-bold text-white">Navigation is client-side</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            The backend has no routing or position endpoint. Pathfinding and
            localization must live in this client when those phases begin.
          </p>
        </article>
      </section>
    </div>
  )
}
