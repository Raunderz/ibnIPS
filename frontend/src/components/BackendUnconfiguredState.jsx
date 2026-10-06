import { PlugZap, RotateCw } from 'lucide-react'
import EmptyState from './EmptyState.jsx'
import { reloadApp } from '../utils/appRefresh.js'

export default function BackendUnconfiguredState() {
  return (
    <EmptyState
      icon={PlugZap}
      tone="warning"
      title="Backend address not set"
      description="This build has no VITE_API_BASE_URL, so no campus data can be loaded. Set the variable, then reload the app."
      action={
        <button
          type="button"
          onClick={reloadApp}
          className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/12 bg-white/5 px-4 text-sm font-semibold text-white transition-colors active:bg-white/10"
        >
          <RotateCw size={16} aria-hidden="true" />
          Reload app
        </button>
      }
    />
  )
}