import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocationCatalog } from './useLocationCatalog.js'
import {
  createNavigationService,
  createNavigationState,
  loadNavigationState,
  saveNavigationState,
  clearNavigationState,
} from '../services/navigation.js'
import { getLocationTitle } from '../utils/location.js'

const EMPTY_LIST = []

function clampSegmentIndex(value, segmentCount) {
  if (!Number.isInteger(value) || value < 0) {
    return 0
  }

  if (segmentCount === 0) {
    return 0
  }

  return Math.min(value, segmentCount - 1)
}

export function useNavigation(destinationId, sourceId) {
  const catalogQuery = useLocationCatalog()
  const nodes = useMemo(() => catalogQuery.data?.nodes ?? EMPTY_LIST, [catalogQuery.data])
  const edges = useMemo(() => catalogQuery.data?.edges ?? EMPTY_LIST, [catalogQuery.data])

  const navigationService = useMemo(
    () => createNavigationService(nodes, edges),
    [nodes, edges],
  )

  const [navigationState, setNavigationState] = useState(() => {
    const saved = loadNavigationState()

    if (saved && saved.destinationId === destinationId && saved.sourceId === sourceId) {
      return saved
    }

    return null
  })

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

    const details = navigationService.getRouteDetails(route)

    if (!details || !Array.isArray(details.segments) || !Array.isArray(details.routeFloors)) {
      return null
    }

    return details
  }, [navigationService, route])

  useEffect(() => {
    if (navigationState) {
      saveNavigationState(navigationState)
    } else {
      clearNavigationState()
    }
  }, [navigationState])

  const isNavigating = Boolean(
    navigationState?.isActive &&
      navigationState.destinationId === destinationId &&
      navigationState.sourceId === sourceId,
  )

  const segments = routeDetails?.segments ?? EMPTY_LIST

  const currentSegment = useMemo(() => {
    if (segments.length === 0) {
      return null
    }

    const index = clampSegmentIndex(
      navigationState?.currentSegmentIndex,
      segments.length,
    )

    return segments[index] ?? null
  }, [segments, navigationState])

  const nextSegment = useMemo(() => {
    if (segments.length === 0) {
      return null
    }

    const index = clampSegmentIndex(
      navigationState?.currentSegmentIndex,
      segments.length,
    ) + 1

    return segments[index] ?? null
  }, [segments, navigationState])

  const progress = useMemo(() => {
    const total = segments.length

    if (total === 0) {
      return { current: 0, total: 0, percentage: 0 }
    }

    const current =
      clampSegmentIndex(navigationState?.currentSegmentIndex, total) + 1

    return {
      current,
      total,
      percentage: Math.round((current / total) * 100),
    }
  }, [segments, navigationState])

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

    setNavigationState({
      ...createNavigationState(destinationId, sourceId, routeDetails),
      isActive: true,
      startedAt: Date.now(),
      currentSegmentIndex: 0,
    })

    return true
  }, [destinationId, sourceId, routeDetails])

  const nextStep = useCallback(() => {
    setNavigationState((previous) => {
      if (!previous) return previous

      const index = clampSegmentIndex(
        previous.currentSegmentIndex,
        segments.length,
      )
      const nextIndex = index + 1

      if (nextIndex >= segments.length) {
        return { ...previous, isActive: false, completedAt: Date.now() }
      }

      return { ...previous, currentSegmentIndex: nextIndex }
    })
  }, [segments.length])

  const previousStep = useCallback(() => {
    setNavigationState((previous) => {
      if (!previous) return previous

      const index = clampSegmentIndex(
        previous.currentSegmentIndex,
        segments.length,
      )

      if (index <= 0) return previous

      return { ...previous, currentSegmentIndex: index - 1 }
    })
  }, [segments.length])

  const stopNavigation = useCallback(() => {
    setNavigationState((previous) => {
      if (!previous) return previous
      return { ...previous, isActive: false }
    })
  }, [])

  const resetNavigation = useCallback(() => {
    setNavigationState((previous) => {
      if (!previous) return previous
      return { ...previous, currentSegmentIndex: 0 }
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