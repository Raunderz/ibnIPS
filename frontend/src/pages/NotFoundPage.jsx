import { ArrowLeft, Compass } from 'lucide-react'
import { Link } from 'react-router-dom'
import BrandMark from '../components/BrandMark.jsx'

export default function NotFoundPage() {
  return (
    <div className="app-canvas min-h-dvh px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] text-slate-100">
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-md flex-col">
        <BrandMark />
        <div className="my-auto py-12 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-brand-500/12 text-brand-300">
            <Compass size={30} aria-hidden="true" />
          </span>
          <p className="mt-6 text-[11px] font-bold tracking-[0.18em] text-brand-300 uppercase">
            404
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-white">
            Screen not found
          </h1>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-slate-400">
            That route does not exist in the ibnIPS app.
          </p>
          <Link
            to="/"
            className="mt-7 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 px-5 text-[15px] font-bold text-ink-950 shadow-accent transition-colors active:bg-brand-600"
          >
            <ArrowLeft size={19} aria-hidden="true" />
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
