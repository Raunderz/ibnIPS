import { ChevronRight, MapPin } from 'lucide-react'
import { getFloorLabel } from '../utils/location.js'

export default function LocationResultRow({ node, isSelected = false, onSelect }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(node)}
        aria-current={isSelected ? 'true' : undefined}
        className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-transparent bg-ink-850 px-3 text-left transition-colors duration-150 active:border-brand-400/40 active:bg-ink-800"
      >
        <span
          className={`grid size-11 shrink-0 place-items-center rounded-2xl transition-colors ${
            isSelected
              ? 'bg-brand-500 text-ink-950'
              : 'bg-brand-500/12 text-brand-300'
          }`}
        >
          <MapPin size={19} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-white">
            {node.name}
          </span>
          <span className="mt-0.5 block truncate text-xs text-slate-400">
            {getFloorLabel(node.floor)} · {node.nodeId}
          </span>
        </span>
        <ChevronRight
          size={18}
          className="shrink-0 text-slate-600"
          aria-hidden="true"
        />
      </button>
    </li>
  )
}
