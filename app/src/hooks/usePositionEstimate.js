import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getNodesById } from '../map/mapGraph.js'
import { matchFingerprints } from '../positioning/fingerprintMatcher.js'
import {
  getScanCapability,
  isFullScanSupported,
  SCAN_PLATFORM,
  scanWifiNetworks,
} from '../positioning/wifiScanner.js'

/** Android permits four scans per two minutes; stay well inside that. */
const MIN_SCAN_INTERVAL_MS = 15_000

/**
 * Why a scan produced no fix, keyed by the matcher's status.
 *
 * `empty-scan` is the one that used to read as a generic failure. It almost
 * always means Android returned redacted or empty BSSIDs, so it gets its own
 * instruction about Wi-Fi and location services.
 */
const MATCH_ERROR_MESSAGES = {
  'empty-scan':
    'No usable Wi-Fi networks came back from the scan. Turn Wi-Fi on, leave location services switched on, and scan again.',
  'no-fingerprints':
    'The campus map has no Wi-Fi fingerprints yet, so ibnIPS cannot place you. Pick your room on the map instead.',
  'out-of-range':
    'None of the Wi-Fi networks around you are in the campus map. ibnIPS only works on campus Wi-Fi.',
  default: 'Could not read a usable Wi-Fi scan. Move around and try again.',
}

export const POSITION_STATUS = Object.freeze({
  idle: 'idle',
  scanning: 'scanning',
  located: 'located',
  error: 'error',
})

/**
 * Turns a Wi-Fi scan into a best-guess room on the map.
 *
 * Scanning is always user initiated: the first call triggers the Android
 * runtime permission prompt, which must not appear on app launch.
 */
export function usePositionEstimate(nodes, fingerprints) {
  const [status, setStatus] = useState(POSITION_STATUS.idle)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [observedCount, setObservedCount] = useState(0)
  const lastScanAt = useRef(0)
  const cooldownTimer = useRef(null)
  const mounted = useRef(true)

  const nodesById = useMemo(() => getNodesById(nodes ?? []), [nodes])
  const capability = getScanCapability()
  const isSupported = capability === SCAN_PLATFORM.full

  // Android permits four scans per two minutes; stay well inside that. The
  // cooldown is held in state and released by a timer so that rendering stays
  // pure, and it starts disabled until a platform that supports scanning is
  // detected.
  const [canRescan, setCanRescan] = useState(() => capability === SCAN_PLATFORM.full)

  useEffect(() => {
    mounted.current = true

    return () => {
      mounted.current = false

      if (cooldownTimer.current) {
        clearTimeout(cooldownTimer.current)
      }
    }
  }, [])

  const scan = useCallback(async () => {
    if (!isSupported) {
      setStatus(POSITION_STATUS.error)
      setError(
        capability === SCAN_PLATFORM.currentOnly
          ? 'iOS does not let apps list nearby Wi-Fi networks, so ibnIPS cannot detect your room here. Pick your start point instead.'
          : 'Wi-Fi scanning needs a real device. Use an Android phone, or pick your start point.',
      )
      return null
    }

    if (!canRescan) {
      return result
    }

    setCanRescan(false)
    setStatus(POSITION_STATUS.scanning)
    setError(null)
    lastScanAt.current = Date.now()

    if (cooldownTimer.current) {
      clearTimeout(cooldownTimer.current)
    }

    cooldownTimer.current = setTimeout(() => {
      setCanRescan(true)
    }, MIN_SCAN_INTERVAL_MS)

    try {
      const { readings } = await scanWifiNetworks()

      if (!mounted.current) {
        return null
      }

      setObservedCount(readings.length)

      const match = matchFingerprints({ fingerprints, readings })

      if (match.status !== 'ok') {
        setStatus(POSITION_STATUS.error)
        setError(MATCH_ERROR_MESSAGES[match.status] ?? MATCH_ERROR_MESSAGES.default)
        setResult(null)
        return null
      }

      const candidates = match.candidates.map((candidate) => ({
        ...candidate,
        node: nodesById.get(candidate.nodeId) ?? null,
      }))

      setResult({ ...match, candidates })
      setStatus(POSITION_STATUS.located)

      return candidates[0]?.node ?? null
    } catch (scanError) {
      if (!mounted.current) {
        return null
      }

      setStatus(POSITION_STATUS.error)
      setError(scanError?.message ?? 'The Wi-Fi scan failed.')
      setResult(null)
      return null
    }
  }, [canRescan, capability, fingerprints, isSupported, nodesById, result])

  const reset = useCallback(() => {
    setStatus(POSITION_STATUS.idle)
    setError(null)
    setResult(null)
  }, [])

  return {
    status,
    error,
    result,
    scan,
    reset,
    canRescan,
    isSupported,
    capability,
    observedCount,
    bestNode: result?.candidates?.[0]?.node ?? null,
    alternatives: (result?.candidates ?? []).slice(1, 4).map((entry) => entry.node),
  }
}

export { isFullScanSupported }
