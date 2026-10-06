import { RefreshCw } from 'lucide-react'
import { isApiConfigured } from '../api/client.js'
import { useBackendHealth } from '../hooks/useBackendHealth.js'

const toneClasses = {
  idle: 'bg-ink-850 border-white/8 text-slate-400',
  pending: 'bg-ink-850 border-white/8 text-slate-300',
  online: 'bg-emerald-400/8 border-emerald-400/20 text-emerald-200',
  offline: 'bg-rose-400/8 border-rose-400/20 text-rose-200',
}

const dotClasses = {
  idle: 'bg-slate-600',
  pending: 'bg-amber-400 animate-pulse',
  online: 'bg-emerald-400',
  offline: 'bg-rose-400',
}

export default function BackendStatusChip() {
  const configured = isApiConfigured()
  const healthQuery = useBackendHealth()

  let tone = 'idle'
  let label = 'API base URL not set'

  if (configured && healthQuery.isPending) {
    tone = 'pending'
    label = 'Checking backend'
  } else if (configured && healthQuery.isError) {
    tone = 'offline'
    label = 'Backend unreachable'
  } else if (configured && healthQuery.data) {
    tone = 'online'
    label = 'Backend online'
  }

  return (
    <div
      className={`flex items-center gap-2.5 rounded-2xl border px-3 py-2 ${toneClasses[tone]}`}
      aria-live="polite"
    >
      <span
        className={`size-2 shrink-0 rounded-full ${dotClasses[tone]}`}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1 truncate text-xs font-semibold">
        {label}
      </span>
      {configured ? (
        <button
          type="button"
          onClick={() => healthQuery.refetch()}
          disabled={healthQuery.isFetching}
          aria-label="Check backend status"
          className="grid size-9 shrink-0 place-items-center rounded-xl text-current opacity-70 transition-opacity active:opacity-100 disabled:opacity-40"
        >
          <RefreshCw
            size={15}
            className={healthQuery.isFetching ? 'animate-spin' : ''}
            aria-hidden="true"
          />
        </button>
      ) : null}
    </div>
  )
}
