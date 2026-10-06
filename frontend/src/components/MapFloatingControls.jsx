import { Focus, Minus, Plus } from 'lucide-react'

const controlClasses =
  'grid size-11 place-items-center rounded-2xl border border-white/10 bg-ink-800/90 text-slate-200 backdrop-blur transition-colors duration-150 active:bg-ink-700 active:text-white disabled:opacity-40'

export default function MapFloatingControls({
  onZoomIn,
  onZoomOut,
  onFit,
  onRecenter,
  canRecenter = false,
  className = '',
}) {
  return (
    <div
      className={`pointer-events-none absolute top-1/2 right-3 flex -translate-y-1/2 flex-col gap-2 ${className}`.trim()}
    >
      <button
        type="button"
        onClick={onZoomIn}
        className={`pointer-events-auto ${controlClasses}`}
        aria-label="Zoom in"
      >
        <Plus size={19} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onZoomOut}
        className={`pointer-events-auto ${controlClasses}`}
        aria-label="Zoom out"
      >
        <Minus size={19} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onFit}
        className={`pointer-events-auto ${controlClasses}`}
        aria-label="Fit map to screen"
      >
        <Focus size={18} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onRecenter}
        disabled={!canRecenter}
        className={`pointer-events-auto ${controlClasses}`}
        aria-label="Centre on selected location"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" />
        </svg>
      </button>
    </div>
  )
}
