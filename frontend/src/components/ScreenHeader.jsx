import { ArrowLeft } from 'lucide-react'
import IconButton from './IconButton.jsx'

export default function ScreenHeader({
  title,
  subtitle,
  backTo = '/',
  showBack = true,
  trailing = null,
}) {
  return (
    <header className="shrink-0 border-b border-white/8 bg-ink-950/92 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-xl">
      <div className="flex h-14 items-center gap-2">
        {showBack ? (
          <IconButton label="Go back" to={backTo}>
            <ArrowLeft size={19} aria-hidden="true" />
          </IconButton>
        ) : null}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold tracking-[-0.01em] text-white">
            {title}
          </h1>
          {subtitle ? (
            <p className="truncate text-xs text-slate-400">{subtitle}</p>
          ) : null}
        </div>
        {trailing}
      </div>
    </header>
  )
}
