import { ArrowRight, Clock3, LocateFixed, MapPinned, Search, X } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import BackendStatusChip from '../components/BackendStatusChip.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { useLocationCatalog } from '../hooks/useLocationCatalog.js'
import { useRecentDestinations } from '../hooks/useRecentDestinations.js'
import { getFloors } from '../map/mapGraph.js'
import {
  getFloorCountLabel,
  getFloorLabel,
  getLocationCountLabel,
  getLocationTitle,
} from '../utils/location.js'

const RECENT_LIMIT = 4
const EMPTY_NODES = []

const sectionTitleClasses =
  'text-[11px] font-bold tracking-[0.16em] text-slate-500 uppercase'

function RecentRow({ node }) {
  return (
    <li>
      <Link
        to={`/search?node=${encodeURIComponent(node.nodeId)}`}
        className="flex min-h-14 items-center gap-3 rounded-2xl border border-transparent bg-ink-850 px-3 transition-colors duration-150 active:border-brand-400/40 active:bg-ink-800"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/5 text-slate-300">
          <Clock3 size={17} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-white">
            {getLocationTitle(node)}
          </span>
          <span className="mt-0.5 block truncate text-xs text-slate-500">
            {getFloorLabel(node.floor)}
          </span>
        </span>
        <ArrowRight size={16} className="shrink-0 text-slate-600" aria-hidden="true" />
      </Link>
    </li>
  )
}

export default function HomePage() {
  const catalogQuery = useLocationCatalog()
  const { items: recentItems, clear: clearRecents } = useRecentDestinations()

  const catalog = catalogQuery.data
  const nodes = useMemo(() => catalog?.nodes ?? EMPTY_NODES, [catalog])
  const floors = useMemo(() => getFloors(nodes), [nodes])
  const knownIds = useMemo(
    () => new Set(nodes.map((node) => node.nodeId)),
    [nodes],
  )
  const recents = useMemo(
    () =>
      (knownIds.size > 0
        ? recentItems.filter((item) => knownIds.has(item.nodeId))
        : recentItems
      ).slice(0, RECENT_LIMIT),
    [recentItems, knownIds],
  )

  return (
    <div className="space-y-7">
      <section>
        <p className="text-[11px] font-bold tracking-[0.18em] text-brand-300 uppercase">
          KIIT campus
        </p>
        <h1 className="mt-3 text-[2rem] leading-[1.06] font-extrabold tracking-[-0.035em] text-balance text-white sm:text-[2.75rem]">
          Where do you want to go?
        </h1>
        <p className="mt-3 text-[15px] leading-6 text-slate-400">
          Search the rooms and locations published by the ibnIPS backend, then
          preview a destination before you move.
        </p>

        <Link
          to="/search"
          className="mt-5 flex min-h-14 items-center gap-3 rounded-2xl border border-white/10 bg-ink-850 px-4 transition-colors duration-150 active:border-brand-400/50 active:bg-ink-800"
        >
          <Search size={19} className="shrink-0 text-slate-500" aria-hidden="true" />
          <span className="min-w-0 flex-1 text-left text-[15px] text-slate-500">
            Search campus location
          </span>
          <ArrowRight size={18} className="shrink-0 text-slate-600" aria-hidden="true" />
        </Link>
      </section>

      <section aria-labelledby="current-location-heading">
        <h2 id="current-location-heading" className={sectionTitleClasses}>
          Current location
        </h2>
        <div className="mt-2.5 rounded-card border border-white/8 bg-ink-850 p-4">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-400/10 text-amber-300">
              <LocateFixed size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">
                Not available on the web yet
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                Browsers cannot read Wi-Fi signals, and the backend exposes no
                position endpoint, so ibnIPS will not guess your node.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="recent-heading">
        <div className="flex items-center justify-between gap-3">
          <h2 id="recent-heading" className={sectionTitleClasses}>
            Recent destinations
          </h2>
          {recents.length > 0 ? (
            <button
              type="button"
              onClick={clearRecents}
              className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-slate-500 transition-colors active:text-white"
            >
              <X size={13} aria-hidden="true" />
              Clear
            </button>
          ) : null}
        </div>

        {recents.length > 0 ? (
          <ul className="mt-2.5 space-y-2">
            {recents.map((node) => (
              <RecentRow key={node.nodeId} node={node} />
            ))}
          </ul>
        ) : (
          <div className="mt-2.5">
            <EmptyState
              icon={Clock3}
              title="No recent destinations"
              description="Destinations you preview are remembered on this device only."
            />
          </div>
        )}
      </section>

      <section aria-labelledby="campus-map-heading">
        <h2 id="campus-map-heading" className={sectionTitleClasses}>
          Campus map
        </h2>

        {catalogQuery.isPending ? (
          <div className="mt-2.5 space-y-2" aria-hidden="true">
            <div className="h-24 animate-pulse rounded-card bg-ink-850" />
          </div>
        ) : catalogQuery.isError ? (
          <div className="mt-2.5">
            <EmptyState
              icon={MapPinned}
              tone="danger"
              title="Map data unavailable"
              description={catalogQuery.error.message}
              action={
                <button
                  type="button"
                  onClick={() => catalogQuery.refetch()}
                  className="inline-flex min-h-11 items-center rounded-2xl border border-white/12 bg-white/5 px-4 text-sm font-semibold text-white active:bg-white/10"
                >
                  Try again
                </button>
              }
            />
          </div>
        ) : (
          <div className="mt-2.5 rounded-card border border-white/8 bg-ink-850 p-4">
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-500/12 text-brand-300">
                <MapPinned size={20} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white">
                  {getLocationCountLabel(nodes.length)} ·{' '}
                  {getFloorCountLabel(floors.length)}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {floors.length > 0
                    ? floors.map((floor) => `Level ${floor}`).join(' · ')
                    : 'No floors published'}
                </p>
              </div>
            </div>
            <Link
              to="/map"
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition-colors active:bg-white/10"
            >
              Open campus map
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        )}
      </section>

      <BackendStatusChip />
    </div>
  )
}
