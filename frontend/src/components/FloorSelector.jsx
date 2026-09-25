import { Layers } from 'lucide-react'
import { getFloorCountLabel } from '../utils/location.js'

export default function FloorSelector({
  floors,
  counts,
  activeFloor,
  onChange,
  className = '',
}) {
  if (floors.length === 0) {
    return null
  }

  return (
    <div className={`flex items-center gap-2 ${className}`.trim()}>
      <span
        className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300"
        aria-hidden="true"
      >
        <Layers size={17} />
      </span>
      <div
        className="no-scrollbar -my-1 flex flex-1 items-center gap-2 overflow-x-auto py-1"
        role="group"
        aria-label="Map floor"
      >
        {floors.map((floor) => {
          const isActive = floor === activeFloor

          return (
            <button
              key={floor}
              type="button"
              onClick={() => onChange(floor)}
              aria-pressed={isActive}
              className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold transition-colors duration-150 ${
                isActive
                  ? 'border-brand-400 bg-brand-500 text-ink-950'
                  : 'border-white/10 bg-ink-800/80 text-slate-300 active:bg-ink-700'
              }`}
            >
              Floor {floor}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                  isActive ? 'bg-ink-950/15 text-ink-950' : 'bg-white/8 text-slate-400'
                }`}
              >
                {counts.get(floor) ?? 0}
              </span>
              <span className="sr-only">
                {getFloorCountLabel(counts.get(floor) ?? 0)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
