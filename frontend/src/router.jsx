import { createBrowserRouter, redirect } from 'react-router-dom'
import RouteErrorPage from './components/RouteErrorPage.jsx'
import RouteLoading from './components/RouteLoading.jsx'

async function loadRoute(loader) {
  const routeModule = await loader()
  return { Component: routeModule.default }
}

const inlineErrorElement = <RouteErrorPage inline />

export const router = createBrowserRouter([
  {
    HydrateFallback: RouteLoading,
    errorElement: <RouteErrorPage />,
    lazy: () => loadRoute(() => import('./routes/RootRoute.jsx')),
    children: [
      {
        errorElement: inlineErrorElement,
        lazy: () => loadRoute(() => import('./layouts/AppLayout.jsx')),
        children: [
          {
            index: true,
            errorElement: inlineErrorElement,
            lazy: () => loadRoute(() => import('./pages/HomePage.jsx')),
          },
          {
            path: 'account',
            errorElement: inlineErrorElement,
            lazy: () => loadRoute(() => import('./routes/AccountRoute.jsx')),
          },
        ],
      },
      {
        path: 'login',
        errorElement: inlineErrorElement,
        lazy: () => loadRoute(() => import('./pages/LoginPage.jsx')),
      },
      {
        path: 'sign-in',
        loader: () => redirect('/login'),
      },
      {
        path: 'search',
        errorElement: inlineErrorElement,
        lazy: () => loadRoute(() => import('./pages/SearchPage.jsx')),
      },
      {
        path: 'map',
        errorElement: inlineErrorElement,
        lazy: () => loadRoute(() => import('./pages/MapPage.jsx')),
      },
      {
        path: 'navigate',
        errorElement: inlineErrorElement,
        lazy: () => loadRoute(() => import('./pages/NavigationPage.jsx')),
      },
      {
        path: '*',
        errorElement: inlineErrorElement,
        lazy: () => loadRoute(() => import('./pages/NotFoundPage.jsx')),
      },
    ],
  },
])