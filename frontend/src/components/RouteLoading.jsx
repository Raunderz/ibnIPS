import { LoaderCircle } from 'lucide-react'

export default function RouteLoading() {
  return (
    <div
      className="app-canvas grid min-h-dvh place-items-center px-6 text-brand-300"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="flex flex-col items-center gap-3">
        <LoaderCircle size={26} className="animate-spin" aria-hidden="true" />
        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
          Loading
        </p>
      </div>
    </div>
  )
}
