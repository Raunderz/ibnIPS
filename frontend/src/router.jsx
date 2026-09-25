import { createBrowserRouter } from 'react-router-dom'
import RouteErrorPage from './components/RouteErrorPage.jsx'
import RouteLoading from './components/RouteLoading.jsx'

async function loadRoute(loader) {
  const routeModule = await loader()
  return { Component: routeModule.default }
}

export const router = createBrowserRouter([
  {
    HydrateFallback: RouteLoading,
    errorElement: <RouteErrorPage />,
    lazy: () => loadRoute(() => import('./routes/RootRoute.jsx')),
    children: [
      {
        lazy: () => loadRoute(() => import('./layouts/AppLayout.jsx')),
        children: [
          {
            index: true,
            lazy: () => loadRoute(() => import('./pages/HomePage.jsx')),
          },
          {
            path: 'map',
            lazy: () => loadRoute(() => import('./pages/MapPage.jsx')),
          },
          {
            path: 'account',
            lazy: () => loadRoute(() => import('./routes/AccountRoute.jsx')),
          },
        ],
      },
      {
        path: 'sign-in',
        lazy: () => loadRoute(() => import('./pages/SignInPage.jsx')),
      },
      {
        path: '*',
        lazy: () => loadRoute(() => import('./pages/NotFoundPage.jsx')),
      },
    ],
  },
])
