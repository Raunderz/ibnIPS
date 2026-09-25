import { useQuery } from '@tanstack/react-query'
import { getBackendHealth } from '../api/campus.js'
import { isApiConfigured } from '../api/client.js'

export const backendHealthKey = ['backend', 'health']

export function useBackendHealth() {
  return useQuery({
    queryKey: backendHealthKey,
    queryFn: ({ signal }) => getBackendHealth(signal),
    enabled: isApiConfigured(),
    staleTime: 30_000,
  })
}
