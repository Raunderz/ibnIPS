import { useQuery } from '@tanstack/react-query'
import { getCampusCatalog } from '../api/campus.js'
import { isApiConfigured } from '../api/client.js'

export const campusCatalogKey = ['campus', 'catalog']

export function useLocationCatalog() {
  return useQuery({
    queryKey: campusCatalogKey,
    queryFn: ({ signal }) => getCampusCatalog(signal),
    enabled: isApiConfigured(),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  })
}
