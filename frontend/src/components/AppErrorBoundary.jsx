import { Component } from 'react'
import { RefreshCw, RotateCw, Undo2 } from 'lucide-react'
import { queryClient } from '../api/queryClient.js'
import { refreshAllData, reloadApp } from '../utils/appRefresh.js'

function toMessage(error) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (typeof error === 'string' && error.trim()) {
    return error
  }

  return 'An unexpected error stopped this screen from rendering.'
}

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
    this.handleRetry = this.handleRetry.bind(this)
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error('ibnIPS render error', error, info)
    }
  }

  /**
   * Re-rendering the same tree with the same cached data just crashes again,
   * so drop the cached queries before letting React try once more.
   */
  handleRetry() {
    try {
      queryClient.clear()
    } catch {
    }

    this.setState({ error: null })
  }

  render() {
    const { error } = this.state

    if (!error) {
      return this.props.children
    }

    return (
      <div className="app-canvas min-h-dvh px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] text-slate-100">
        <div className="mx-auto grid min-h-[calc(100dvh-2rem)] w-full max-w-md place-items-center">
          <section
            role="alert"
            className="w-full rounded-card border border-rose-400/20 bg-rose-400/8 p-6 text-center"
          >
            <h1 className="text-xl font-extrabold tracking-[-0.02em] text-white">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm leading-6 text-rose-100/70">{toMessage(error)}</p>
            <div className="mt-6 grid gap-2">
              <button
                type="button"
                onClick={this.handleRetry}
                className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-brand-500 px-5 text-[15px] font-bold text-ink-950 transition-colors active:bg-brand-600"
              >
                <Undo2 size={18} aria-hidden="true" />
                Try again
              </button>
              <button
                type="button"
                onClick={() => {
                  refreshAllData()
                }}
                className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/5 px-5 text-[15px] font-bold text-white transition-colors active:bg-white/10"
              >
                <RefreshCw size={18} aria-hidden="true" />
                Refresh data
              </button>
              <button
                type="button"
                onClick={() => {
                  reloadApp()
                }}
                className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/5 px-5 text-[15px] font-bold text-white transition-colors active:bg-white/10"
              >
                <RotateCw size={18} aria-hidden="true" />
                Reload app
              </button>
            </div>
          </section>
        </div>
      </div>
    )
  }
}