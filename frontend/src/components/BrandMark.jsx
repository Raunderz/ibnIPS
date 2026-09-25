import { Compass } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function BrandMark() {
  return (
    <Link
      to="/"
      className="inline-flex min-h-12 items-center gap-3 rounded-2xl px-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-400"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand-500 text-ink-950 shadow-lg shadow-brand-950/40">
        <Compass size={22} strokeWidth={2.2} aria-hidden="true" />
      </span>
      <span className="leading-tight">
        <span className="block text-base font-bold tracking-tight text-white">
          ibnIPS
        </span>
        <span className="block text-xs text-slate-400">Indoor wayfinding</span>
      </span>
    </Link>
  )
}
