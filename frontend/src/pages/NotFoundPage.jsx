import { ArrowLeft, MapPinned } from 'lucide-react'
import { Link } from 'react-router-dom'
import BrandMark from '../components/BrandMark.jsx'

export default function NotFoundPage() {
  return (
    <div className="min-h-dvh bg-ink-950 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] text-slate-100">
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-lg flex-col">
        <BrandMark />
        <div className="my-auto py-12 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-brand-400/12 text-brand-300">
            <MapPinned size={30} aria-hidden="true" />
          </span>
          <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-brand-300">
            404
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.03em] text-white">
            Page not found
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-400">
            The requested page does not exist in this frontend.
          </p>
          <Link
            to="/"
            className="mt-7 inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-brand-400 px-5 font-bold text-ink-950 active:bg-brand-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-200"
          >
            <ArrowLeft size={19} aria-hidden="true" />
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
