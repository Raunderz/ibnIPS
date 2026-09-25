import { Search, X } from 'lucide-react'

export default function SearchField({
  value,
  onChange,
  onClear,
  onKeyDown,
  inputRef,
  autoFocus = false,
  placeholder = 'Search campus location',
  resultLabel,
}) {
  return (
    <div className="relative">
      <Search
        size={19}
        className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-slate-500"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        type="search"
        className="search-input h-14 w-full appearance-none rounded-2xl border border-white/10 bg-ink-850 pr-13 pl-12 text-base text-white outline-none transition-colors duration-150 placeholder:text-slate-500 focus:border-brand-400/70 focus:ring-2 focus:ring-brand-400/25"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        inputMode="search"
        enterKeyHint="search"
        aria-label="Search campus locations by building, room, or node name"
        aria-describedby={resultLabel ? 'search-result-count' : undefined}
      />
      {value ? (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="absolute top-1/2 right-1.5 grid size-11 -translate-y-1/2 place-items-center rounded-2xl text-slate-400 transition-colors active:bg-white/10 active:text-white"
        >
          <X size={18} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}
