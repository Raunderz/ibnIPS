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
    <div className="min-h-dvh bg-ink-950 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] text-slate-100 sm:px-6">
      <div className="mx-auto grid min-h-[calc(100dvh-2rem)] max-w-lg place-items-center">
        <section
          role="alert"
          className="w-full rounded-[2rem] border border-rose-400/20 bg-rose-400/8 p-5 text-center sm:p-8"
        >
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-rose-400/12 text-rose-300">
            <AlertTriangle size={26} aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-2xl font-black tracking-tight text-white">
            This page could not be loaded
          </h1>
          <p className="mt-2 text-sm leading-6 text-rose-100/70">
            {getErrorMessage(error)}
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              to="/"
              className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-brand-400 px-5 font-bold text-ink-950 active:bg-brand-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-200"
            >
              <Home size={19} aria-hidden="true" />
              Go home
            </Link>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/5 px-5 font-bold text-white active:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
            >
              <RefreshCw size={19} aria-hidden="true" />
              Reload
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
