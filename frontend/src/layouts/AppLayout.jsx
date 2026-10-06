import { AppTopBar, BottomTabBar } from '../components/AppNavigation.jsx'
import PageTransition from '../components/PageTransition.jsx'

export default function AppLayout() {
  return (
    <div className="app-canvas min-h-dvh text-slate-100">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:bg-brand-500 focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-ink-950"
      >
        Skip to content
      </a>
      <AppTopBar />
      <PageTransition />
      <BottomTabBar />
    </div>
  )
}
