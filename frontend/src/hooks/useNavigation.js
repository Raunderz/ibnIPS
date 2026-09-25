import { useCallback, useMemo, useState } from 'react'
import { useLocationCatalog } from './useLocationCatalog.js'
import { createNavigationService, createNavigationState, loadNavigationState, saveNavigationState, clearNavigationState } from '../services/navigation.js'
import { getLocationTitle } from '../utils/location.js'

export function useNavigation(destinationId, sourceId) {
  const catalogQuery = useLocationCatalog()
  const nodes = useMemo(() => catalogQuery.data?.nodes ?? [], [catalogQuery.data])
  const edges = useMemo(() => catalogQuery.data?.edges ?? [], [catalogQuery.data])

  const navigationService = useMemo(
    () => createNavigationService(nodes, edges),
    [nodes, edges]
  )

  const initialNavigationState = useMemo(() => {
    const saved = loadNavigationState()
    if (saved && saved.destinationId === destinationId && saved.sourceId === sourceId) {
      return saved
    }
    if (destinationId && sourceId) {
      const route = navigationService.calculateRoute(sourceId, destinationId)
      if (route) {
        const routeDetails = navigationService.getRouteDetails(route)
        if (routeDetails) {
          return createNavigationState(destinationId, sourceId, routeDetails)
        }
      }
    }
    return null
  }, [destinationId, sourceId, navigationService])

  const [navigationState, setNavigationState] = useState(initialNavigationState)
  const [isNavigating, setIsNavigating] = useState(false)

  const route = useMemo(() => {
    if (!destinationId || !sourceId) {
      return null
    }
    return navigationService.calculateRoute(sourceId, destinationId)
  }, [navigationService, destinationId, sourceId])

  const routeDetails = useMemo(() => {
    if (!route) {
      return null
    }
    return navigationService.getRouteDetails(route)
  }, [navigationService, route])

  const currentSegment = useMemo(() => {
    if (!routeDetails || !routeDetails.segments.length) {
      return null
    }
    const index = navigationState?.currentSegmentIndex ?? 0
    return routeDetails.segments[Math.min(index, routeDetails.segments.length - 1)] ?? null
  }, [routeDetails, navigationState])

  const nextSegment = useMemo(() => {
    if (!routeDetails || !routeDetails.segments.length) {
      return null
    }
    const index = (navigationState?.currentSegmentIndex ?? 0) + 1
    return routeDetails.segments[index] ?? null
  }, [routeDetails, navigationState])

  const progress = useMemo(() => {
    if (!routeDetails || !routeDetails.segments.length) {
      return { current: 0, total: 0, percentage: 0 }
    }
    const current = (navigationState?.currentSegmentIndex ?? 0) + 1
    const total = routeDetails.segments.length
    return {
      current: Math.min(current, total),
      total,
      percentage: Math.round((current / total) * 100),
    }
  }, [routeDetails, navigationState])

  const destinationNode = useMemo(() => {
    if (!destinationId) return null
    return navigationService.nodesById.get(destinationId) ?? null
  }, [navigationService, destinationId])

  const sourceNode = useMemo(() => {
    if (!sourceId) return null
    return navigationService.nodesById.get(sourceId) ?? null
  }, [navigationService, sourceId])

  const startNavigation = useCallback(() => {
    if (!routeDetails) return false

    const newState = createNavigationState(destinationId, sourceId, routeDetails)
    newState.isActive = true
    newState.startedAt = Date.now()
    newState.currentSegmentIndex = 0

    setNavigationState(newState)
    setIsNavigating(true)
    saveNavigationState(newState)
    return true
  }, [destinationId, sourceId, routeDetails])

  const nextStep = useCallback(() => {
    setNavigationState((prev) => {
      if (!prev || !routeDetails) return prev

      const nextIndex = prev.currentSegmentIndex + 1
      if (nextIndex >= routeDetails.segments.length) {
        const completed = { ...prev, isActive: false, completedAt: Date.now() }
        clearNavigationState()
        setIsNavigating(false)
        return completed
      }

      const updated = { ...prev, currentSegmentIndex: nextIndex }
      saveNavigationState(updated)
      return updated
    })
  }, [routeDetails])

  const previousStep = useCallback(() => {
    setNavigationState((prev) => {
      if (!prev || prev.currentSegmentIndex <= 0) return prev

      const updated = { ...prev, currentSegmentIndex: prev.currentSegmentIndex - 1 }
      saveNavigationState(updated)
      return updated
    })
  }, [])

  const stopNavigation = useCallback(() => {
    setNavigationState((prev) => {
      if (!prev) return null
      const stopped = { ...prev, isActive: false }
      clearNavigationState()
      setIsNavigating(false)
      return stopped
    })
  }, [])

  const resetNavigation = useCallback(() => {
    setNavigationState((prev) => {
      if (!prev) return null
      const reset = { ...prev, currentSegmentIndex: 0 }
      saveNavigationState(reset)
      return reset
    })
  }, [])

  return {
    catalogQuery,
    nodes,
    edges,
    route,
    routeDetails,
    navigationState,
    isNavigating,
    currentSegment,
    nextSegment,
    progress,
    destinationNode,
    sourceNode,
    startNavigation,
    nextStep,
    previousStep,
    stopNavigation,
    resetNavigation,
    getLocationTitle: (node) => getLocationTitle(node),
  }
}