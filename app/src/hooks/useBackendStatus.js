import { useSyncExternalStore } from 'react'
import { useBackendHealth } from './useBackendHealth.js'
import {
  getApiBaseUrl,
  getApiBaseUrlSource,
  subscribeToApiConfig,
} from '../api/runtimeConfig.js'

/**
 * Reachability of the configured backend, plus the address in use.
 *
 * The base URL is read through `useSyncExternalStore` so that changing it on the
 * Account screen immediately re-checks health everywhere else.
 */
export function useBackendStatus() {
  const baseUrl = useSyncExternalStore(
    subscribeToApiConfig,
    getApiBaseUrl,
    getApiBaseUrl,
  )

  const query = useBackendHealth()

  const state = query.isPending
    ? 'checking'
    : query.isError
      ? 'offline'
      : 'online'

  return {
    state,
    baseUrl,
    source: getApiBaseUrlSource(),
    health: query.data ?? null,
    error: query.error ?? null,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  }
}
