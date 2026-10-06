import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useLocationCatalog } from '../hooks/useLocationCatalog.js'
import { POSITION_STATUS, usePositionEstimate } from '../hooks/usePositionEstimate.js'

const PositionContext = createContext(null)

/**
 * Holds the single source of truth for "where the user is".
 *
 * Scanning costs battery and triggers a permission prompt, so the estimate is
 * captured once and shared by every screen rather than re-scanned per screen.
 */
export function PositionProvider({ children }) {
  const catalogQuery = useLocationCatalog()
  const nodes = catalogQuery.data?.nodes
  const fingerprints = catalogQuery.data?.fingerprints

  const estimate = usePositionEstimate(nodes, fingerprints)
  const [manualNode, setManualNode] = useState(null)

  const clearManualPosition = useCallback(() => {
    setManualNode(null)
    estimate.reset()
  }, [estimate])

  const value = useMemo(() => {
    const scannedNode = estimate.bestNode
    const positionNode = manualNode ?? scannedNode

    return {
      ...estimate,
      catalog: catalogQuery.data ?? null,
      isLoadingCatalog: catalogQuery.isPending,
      catalogError: catalogQuery.error ?? null,
      refetchCatalog: catalogQuery.refetch,
      positionNode,
      isManual: Boolean(manualNode),
      confidence: manualNode ? null : (estimate.result?.confidence ?? null),
      confidenceLabel: manualNode
        ? 'manual'
        : (estimate.result?.confidenceLabel ?? null),
      candidates: estimate.result?.candidates ?? [],
      setManualPosition: setManualNode,
      clearManualPosition,
      isLocating: estimate.status === POSITION_STATUS.scanning,
      hasFingerprintData: Object.keys(fingerprints ?? {}).length > 0,
    }
  }, [catalogQuery, clearManualPosition, estimate, fingerprints, manualNode])

  return (
    <PositionContext.Provider value={value}>{children}</PositionContext.Provider>
  )
}

export function usePosition() {
  const context = useContext(PositionContext)

  if (!context) {
    throw new Error('usePosition must be used inside a PositionProvider.')
  }

  return context
}
