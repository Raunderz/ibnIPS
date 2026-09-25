import { RefreshCw, Server, ServerOff } from 'lucide-react'
import { isApiConfigured } from '../api/client.js'
import { useBackendHealth } from '../hooks/useBackendHealth.js'

function StatusRow({ icon: Icon, title, description, tone }) {
  const toneClasses = {
    success: 'bg-emerald-400/12 text-emerald-300',
    warning: 'bg-amber-400/12 text-amber-300',
    danger: 'bg-rose-400/12 text-rose-300',
  }

  return (
    <div className="flex items-start gap-4 rounded-3xl border border-white/8 bg-white/4 p-4 sm:p-5">
      <span
        className={`grid size-11 shrink-0 place-items-center rounded-2xl ${toneClasses[tone]}`}
      >
        <Icon size={21} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-white">{title}</p>
        <p className="mt-1 break-words text-sm leading-6 text-slate-400">
          {description}
        </p>
      </div>
    </div>
  )
}

export default function BackendStatusCard() {
  const configured = isApiConfigured()
  const healthQuery = useBackendHealth()

  if (!configured) {
    return (
      <StatusRow
        icon={ServerOff}
        title="API not configured"
        description="Set VITE_API_BASE_URL in your local environment before making backend requests."
        tone="warning"
      />
    )
  }

  if (healthQuery.isPending) {
    return (
      <StatusRow
        icon={RefreshCw}
        title="Checking backend"
        description="Contacting the configured ibnIPS health endpoint."
        tone="warning"
      />
    )
  }

  if (healthQuery.isError) {
    return (
      <div className="rounded-3xl border border-white/8 bg-white/4 p-4 sm:p-5">
        <StatusRow
          icon={ServerOff}
          title="Backend unavailable"
          description={healthQuery.error.message}
          tone="danger"
        />
        <button
          type="button"
          onClick={() => healthQuery.refetch()}
          disabled={healthQuery.isFetching}
          className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 text-sm font-semibold text-white active:bg-white/10 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 sm:w-auto"
        >
          <RefreshCw
            size={17}
            className={healthQuery.isFetching ? 'animate-spin' : ''}
            aria-hidden="true"
          />
          {healthQuery.isFetching ? 'Retrying' : 'Retry health check'}
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-white/8 bg-white/4 p-4 sm:p-5">
      <StatusRow
        icon={Server}
        title="Backend reachable"
        description={healthQuery.data}
        tone="success"
      />
      <button
        type="button"
        onClick={() => healthQuery.refetch()}
        disabled={healthQuery.isFetching}
        className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 text-sm font-semibold text-white active:bg-white/10 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 sm:w-auto"
      >
        <RefreshCw
          size={17}
          className={healthQuery.isFetching ? 'animate-spin' : ''}
          aria-hidden="true"
        />
        {healthQuery.isFetching ? 'Refreshing' : 'Check again'}
      </button>
    </div>
  )
}
