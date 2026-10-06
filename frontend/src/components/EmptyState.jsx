export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = 'neutral',
}) {
  const toneClasses = {
    neutral: 'bg-white/5 text-slate-300 border-white/10',
    warning: 'bg-amber-400/10 text-amber-200 border-amber-400/20',
    danger: 'bg-rose-400/10 text-rose-200 border-rose-400/20',
  }

  return (
    <div
      className={`rounded-card border p-5 text-center ${toneClasses[tone]}`}
    >
      {Icon ? (
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-white/5">
          <Icon size={22} aria-hidden="true" />
        </span>
      ) : null}
      <p className="mt-3 text-[15px] font-bold text-white">{title}</p>
      {description ? (
        <p className="mx-auto mt-1.5 max-w-xs text-sm leading-6 text-slate-400">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}
