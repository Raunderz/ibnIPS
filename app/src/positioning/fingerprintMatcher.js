/**
 * Wi-Fi fingerprint matching.
 *
 * Every node in `map.json` carries the BSSID/RSSI of the access points visible
 * from that spot. Standing at a node reproduces roughly those signal strengths,
 * so the node whose recorded RSSI profile best explains an observed scan is the
 * most likely position.
 *
 * This module is deliberately free of React Native imports so it can be unit
 * tested with the plain Node test runner.
 */

/** RSSI spread, in dB, treated as "same signal strength". */
export const DEFAULT_SIGMA = 6

/** Observed matches needed before a result is considered well evidenced. */
export const MIN_TRUSTWORTHY_MATCHES = 5

/** Android reports these when it is hiding the real values from the app. */
const OPAQUE_BSSIDS = new Set(['02:00:00:00:00:00', '00:00:00:00:00:00'])

const MIN_RSSI = -110
const MAX_RSSI = -20

export const CONFIDENCE_HIGH = 70
export const CONFIDENCE_MEDIUM = 40

export function getConfidenceLabel(confidence) {
  if (confidence >= CONFIDENCE_HIGH) {
    return 'high'
  }

  if (confidence >= CONFIDENCE_MEDIUM) {
    return 'medium'
  }

  return 'low'
}

/** Lower-cases a BSSID and strips separators so scans compare reliably. */
export function normalizeBssid(value) {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim().toLowerCase().replace(/[^0-9a-f]/g, '')

  if (normalized.length !== 12) {
    return null
  }

  return normalized.match(/.{2}/g).join(':')
}

/**
 * Rejects readings Android returns when permission is missing: null BSSIDs,
 * the `02:00:...` placeholder, and out-of-band RSSI values.
 */
export function isUsableReading(reading) {
  if (!reading || typeof reading !== 'object') {
    return false
  }

  const bssid = normalizeBssid(reading.bssid)

  if (!bssid || OPAQUE_BSSIDS.has(bssid)) {
    return false
  }

  const rssi = Number(reading.rssi)

  if (!Number.isFinite(rssi) || rssi === 0) {
    return false
  }

  return rssi >= MIN_RSSI && rssi <= MAX_RSSI
}

export function clampRssi(value) {
  return Math.min(Math.max(Number(value), MIN_RSSI), MAX_RSSI)
}

/**
 * Reduces a scan to one entry per BSSID, keeping the strongest observation.
 * The same AP is often reported once per band or per mesh link.
 */
export function normalizeScan(readings) {
  const strongestByBssid = new Map()

  for (const reading of readings ?? []) {
    if (!isUsableReading(reading)) {
      continue
    }

    const bssid = normalizeBssid(reading.bssid)
    const rssi = clampRssi(reading.rssi)
    const existing = strongestByBssid.get(bssid)

    if (!existing || rssi > existing.rssi) {
      strongestByBssid.set(bssid, { bssid, rssi })
    }
  }

  return [...strongestByBssid.values()]
}

/**
 * Inverts the fingerprint library into `bssid -> [{ nodeId, rssi }]`.
 *
 * The mean RSSI is used when a node recorded the same BSSID more than once, so
 * one noisy sample cannot dominate a node's profile.
 */
export function buildFingerprintIndex(fingerprints) {
  const sums = new Map()

  for (const [nodeId, readings] of Object.entries(fingerprints ?? {})) {
    for (const reading of readings ?? []) {
      if (!isUsableReading(reading)) {
        continue
      }

      const bssid = normalizeBssid(reading.bssid)
      const entry = sums.get(bssid) ?? new Map()
      const current = entry.get(nodeId) ?? { total: 0, count: 0 }
      current.total += clampRssi(reading.rssi)
      current.count += 1
      entry.set(nodeId, current)
      sums.set(bssid, entry)
    }
  }

  const index = new Map()

  for (const [bssid, nodes] of sums) {
    index.set(
      bssid,
      [...nodes].map(([nodeId, { total, count }]) => ({
        nodeId,
        rssi: total / count,
      })),
    )
  }

  return index
}

function gaussianWeight(delta, sigma) {
  return Math.exp(-(delta * delta) / (2 * sigma * sigma))
}

/**
 * Ranks nodes against a scan.
 *
 * Confidence combines three independent signals so that a single coincidental
 * AP match can never read as a confident fix:
 *
 *   evidence   - how many observed APs the winner explains
 *   fit        - how closely those APs match the recorded RSSI values
 *   separation - how far ahead the winner is of the runner-up
 */
export function matchFingerprints({
  fingerprints,
  readings,
  sigma = DEFAULT_SIGMA,
  limit = 5,
} = {}) {
  const scan = normalizeScan(readings)

  if (scan.length === 0) {
    return { status: 'empty-scan', candidates: [], observedCount: 0, knownCount: 0 }
  }

  const index = buildFingerprintIndex(fingerprints)

  if (index.size === 0) {
    return {
      status: 'no-fingerprints',
      candidates: [],
      observedCount: scan.length,
      knownCount: 0,
    }
  }

  const scores = new Map()
  let knownCount = 0

  for (const reading of scan) {
    const observations = index.get(reading.bssid)

    if (!observations) {
      continue
    }

    knownCount += 1

    for (const observation of observations) {
      const weight = gaussianWeight(reading.rssi - observation.rssi, sigma)
      const current = scores.get(observation.nodeId) ?? { score: 0, matches: 0 }
      current.score += weight
      current.matches += 1
      scores.set(observation.nodeId, current)
    }
  }

  if (knownCount === 0) {
    return {
      status: 'out-of-range',
      candidates: [],
      observedCount: scan.length,
      knownCount: 0,
    }
  }

  const ranked = [...scores]
    .map(([nodeId, { score, matches }]) => ({
      nodeId,
      score,
      matches,
      fit: score / matches,
      coverage: matches / knownCount,
    }))
    .sort(
      (first, second) =>
        second.score - first.score ||
        second.matches - first.matches ||
        first.nodeId.localeCompare(second.nodeId),
    )
    .slice(0, limit)

  const [best, runnerUp] = ranked
  const separation = runnerUp ? (best.score - runnerUp.score) / best.score : 1
  const evidence = Math.min(1, best.matches / MIN_TRUSTWORTHY_MATCHES)
  const confidence = Math.round(
    100 * evidence * best.fit * (0.4 + 0.6 * separation),
  )

  return {
    status: 'ok',
    candidates: ranked,
    best,
    confidence,
    confidenceLabel: getConfidenceLabel(confidence),
    observedCount: scan.length,
    knownCount,
  }
}
