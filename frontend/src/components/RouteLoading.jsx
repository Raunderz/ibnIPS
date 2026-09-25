import { LoaderCircle } from 'lucide-react'

export default function RouteLoading() {
  return (
    <div
      className="grid min-h-[60dvh] place-items-center text-brand-300"
      role="status"
      aria-label="Loading page"
    >
      <LoaderCircle size={28} className="animate-spin" aria-hidden="true" />
    </div>
  )
}
