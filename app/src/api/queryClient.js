import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './client.js'

function shouldRetry(failureCount, error) {
  if (failureCount >= 1) {
    return false
  }

  if (!(error instanceof ApiError)) {
    return true
  }

  return error.status === 0 || error.status >= 500
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: shouldRetry,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})
