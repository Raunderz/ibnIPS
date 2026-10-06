import { Link } from 'react-router-dom'

const baseClasses =
  'grid size-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition-colors duration-150 active:bg-white/10 active:text-white disabled:opacity-40'

export default function IconButton({
  label,
  to,
  children,
  className = '',
  type = 'button',
  ...props
}) {
  const classes = `${baseClasses} ${className}`.trim()

  if (to) {
    return (
      <Link to={to} aria-label={label} className={classes} {...props}>
        {children}
      </Link>
    )
  }

  return (
    <button type={type} aria-label={label} className={classes} {...props}>
      {children}
    </button>
  )
}
