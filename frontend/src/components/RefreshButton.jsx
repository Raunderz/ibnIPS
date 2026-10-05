import { useIsFetching } from '@tanstack/react-query'
import { RefreshCw, RotateCw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { refreshAllData, reloadApp } from '../utils/appRefresh.js'

const SIZES = {
  sm: {
    button: 'size-10 rounded-xl',
    icon: 16,
    status: 'text-[11px]',
  },
  md: {
    button: 'size-11 rounded-2xl',
    icon: 18,
    status: 'text-xs',
  },
}

const TONES = {
  ghost: 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white',
  solid: 'border border-brand-400 bg-brand-500 text-ink-950 hover:bg-brand-600',
}

const MIN_SPIN_MS = 350

export default function RefreshButton({
  hard = false,
  label = hard ? 'Reload app' : 'Refresh',
  busyLabel = hard ? 'Reloading' : 'Refreshing',
  onRefresh,
  size = 'md',
  tone = 'ghost',
  className = '',
  showStatus = false,
}) {
  const isFetching = useIsFetching()
  const [pending, setPending] = useState(false)
  const timerRef = useRef(null)
  const dimensions = SIZES[size] ?? SIZES.md
  const toneClasses = TONES[tone] ?? TONES.ghost
  const Icon = hard ? RotateCw : RefreshCw

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [])

  const handleClick = useCallback(() => {
    if (hard) {
      reloadApp()
      return
    }

    if (pending) {
      return
    }

    setPending(true)

    const run =
      typeof onRefresh === 'function'
        ? Promise.resolve(onRefresh())
        : refreshAllData()

    Promise.resolve(run)
      .catch(() => {})
      .finally(() => {
        if (timerRef.current !== null) {
          window.clearTimeout(timerRef.current)
        }

        timerRef.current = window.setTimeout(() => {
          timerRef.current = null
          setPending(false)
        }, MIN_SPIN_MS)
      })
  }, [hard, onRefresh, pending])

  // A hard reload tears the page down, so showing a spinner for it would only
  // flash. Data refresh also waits on the global fetching count.
  const busy = !hard && (pending || isFetching > 0)

  return (
    <div className={`flex items-center gap-2 ${className}`.trim()}>
      <button
        type="button"
        onClick={handleClick}
        disabled={!hard && busy}
        aria-label={busy ? busyLabel : label}
        title={busy ? busyLabel : label}
        className={`grid shrink-0 place-items-center transition-opacity duration-150 disabled:cursor-progress disabled:opacity-60 ${dimensions.button} ${toneClasses}`}
      >
        <Icon
          size={dimensions.icon}
          className={busy ? 'animate-spin' : ''}
          aria-hidden="true"
        />
      </button>
      {showStatus ? (
        <span
          role="status"
          aria-live="polite"
          className={`truncate font-semibold text-slate-500 ${dimensions.status}`}
        >
          {busy ? busyLabel : label}
        </span>
      ) : null}
    </div>
  )
}