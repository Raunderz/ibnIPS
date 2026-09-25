import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'

function getErrorMessage(error) {
  if (isRouteErrorResponse(error)) {
    return error.statusText || 'The requested page could not be loaded.'
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'An unexpected application error occurred.'
}

export default function RouteErrorPage() {
  const error = useRouteError()

  return (
    <div className="app-canvas min-h-dvh px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] text-slate-100">
      <div className="mx-auto grid min-h-[calc(100dvh-2rem)] w-full max-w-md place-items-center">
        <section
          role="alert"
          className="w-full rounded-card border border-rose-400/20 bg-rose-400/8 p-6 text-center"
        >
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-rose-400/12 text-rose-300">
            <AlertTriangle size={26} aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-xl font-extrabold tracking-[-0.02em] text-white">
            This screen failed to load
          </h1>
          <p className="mt-2 text-sm leading-6 text-rose-100/70">
            {getErrorMessage(error)}
          </p>
          <div className="mt-6 grid gap-2">
            <Link
              to="/"
              className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-brand-500 px-5 font-bold text-ink-950 transition-colors active:bg-brand-600"
            >
              <Home size={19} aria-hidden="true" />
              Go home
            </Link>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/5 px-5 font-bold text-white transition-colors active:bg-white/10"
            >
              <RefreshCw size={19} aria-hidden="true" />
              Reload app
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
