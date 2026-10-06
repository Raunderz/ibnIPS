import { Compass } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function BrandMark({ showTagline = false }) {
  return (
    <Link
      to="/"
      className="inline-flex min-h-11 items-center gap-2.5 rounded-2xl pr-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-300"
      aria-label="ibnIPS home"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-500 text-ink-950 shadow-accent">
        <Compass size={19} strokeWidth={2.4} aria-hidden="true" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-extrabold tracking-[-0.02em] text-white">
          ibnIPS
        </span>
        {showTagline ? (
          <span className="mt-1 hidden text-[11px] font-medium text-slate-500 sm:block">
            Indoor wayfinding
          </span>
        ) : null}
      </span>
    </Link>
  )
}
