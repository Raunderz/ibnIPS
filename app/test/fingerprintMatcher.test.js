import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CONFIDENCE_HIGH,
  CONFIDENCE_MEDIUM,
  DEFAULT_SIGMA,
  getConfidenceLabel,
  isUsableReading,
  matchFingerprints,
  normalizeBssid,
  normalizeScan,
} from '../src/positioning/fingerprintMatcher.js'

/** Builds `count` distinct APs all reporting the same strength. */
function aps(count, rssi = -40, prefix = 'aabbccdd') {
  return Array.from({ length: count }, (_unused, index) => ({
    bssid: `${prefix}${String(index).padStart(4, '0')}`,
    rssi,
  }))
}

test('normalizeBssid lower-cases and re-separates the address', () => {
  assert.equal(normalizeBssid('AA:BB:CC:DD:EE:01'), 'aa:bb:cc:dd:ee:01')
  assert.equal(normalizeBssid('aa-bb-cc-dd-ee-01'), 'aa:bb:cc:dd:ee:01')
  assert.equal(normalizeBssid('aabbccddee01'), 'aa:bb:cc:dd:ee:01')
})

test('normalizeBssid rejects anything that is not a full MAC', () => {
  assert.equal(normalizeBssid('AA:BB:CC'), null)
  assert.equal(normalizeBssid(''), null)
  assert.equal(normalizeBssid(null), null)
  assert.equal(normalizeBssid(undefined), null)
})

test('isUsableReading drops the placeholder Android returns without permission', () => {
  assert.equal(isUsableReading({ bssid: '02:00:00:00:00:00', rssi: -50 }), false)
  assert.equal(isUsableReading({ bssid: '00:00:00:00:00:00', rssi: -50 }), false)
})

test('isUsableReading drops impossible signal strengths', () => {
  assert.equal(isUsableReading({ bssid: 'aa:bb:cc:dd:ee:01', rssi: 0 }), false)
  assert.equal(isUsableReading({ bssid: 'aa:bb:cc:dd:ee:01', rssi: 5 }), false)
  assert.equal(isUsableReading({ bssid: 'aa:bb:cc:dd:ee:01', rssi: -200 }), false)
  assert.equal(isUsableReading({ bssid: 'aa:bb:cc:dd:ee:01', rssi: 'loud' }), false)
  assert.equal(isUsableReading({ bssid: 'aa:bb:cc:dd:ee:01', rssi: -55 }), true)
})

test('normalizeScan keeps one entry per BSSID, the strongest', () => {
  const scan = normalizeScan([
    { bssid: 'AA:BB:CC:DD:EE:01', rssi: -70 },
    { bssid: 'aa:bb:cc:dd:ee:01', rssi: -45 },
    { bssid: 'AA:BB:CC:DD:EE:02', rssi: -88 },
  ])

  assert.equal(scan.length, 2)
  assert.deepEqual(
    scan.find((entry) => entry.bssid === 'aa:bb:cc:dd:ee:01'),
    { bssid: 'aa:bb:cc:dd:ee:01', rssi: -45 },
  )
})

test('normalizeScan copes with no readings at all', () => {
  assert.deepEqual(normalizeScan(undefined), [])
  assert.deepEqual(normalizeScan(null), [])
})

test('an empty scan is reported, never guessed', () => {
  const match = matchFingerprints({
    fingerprints: { NODE_A: aps(6) },
    readings: [],
  })

  assert.equal(match.status, 'empty-scan')
  assert.equal(match.candidates.length, 0)
})

test('a missing fingerprint library is reported as its own status', () => {
  const match = matchFingerprints({ fingerprints: {}, readings: aps(6) })

  assert.equal(match.status, 'no-fingerprints')
  assert.equal(match.candidates.length, 0)
})

test('networks that are not in the map read as out of range', () => {
  const match = matchFingerprints({
    fingerprints: { NODE_A: aps(6) },
    readings: aps(3, -40, 'ffeeddcc'),
  })

  assert.equal(match.status, 'out-of-range')
  assert.equal(match.knownCount, 0)
})

test('a full five-AP agreement is high confidence', () => {
  const match = matchFingerprints({
    fingerprints: { NODE_A: aps(5) },
    readings: aps(5),
  })

  assert.equal(match.status, 'ok')
  assert.equal(match.best.nodeId, 'NODE_A')
  assert.equal(match.confidenceLabel, 'high')
  assert.equal(match.confidence, 100)
})

test('a single coincidental AP is deliberately not a confident fix', () => {
  const match = matchFingerprints({
    fingerprints: { NODE_A: aps(1) },
    readings: aps(1),
  })

  assert.equal(match.status, 'ok')
  assert.equal(match.best.nodeId, 'NODE_A')
  assert.ok(
    match.confidence < CONFIDENCE_HIGH,
    `one AP should not read as high confidence, got ${match.confidence}`,
  )
})

test('weak RSSI agreement scores lower than a close match', () => {
  const fingerprints = { NODE_A: aps(5, -40) }

  const close = matchFingerprints({ fingerprints, readings: aps(5, -42) })
  const drifted = matchFingerprints({ fingerprints, readings: aps(5, -75) })

  assert.ok(close.confidence > drifted.confidence)
  assert.ok(close.best.fit > drifted.best.fit)
})

test('the node explaining the most access points wins', () => {
  const match = matchFingerprints({
    fingerprints: {
      FEW: aps(2, -40, '11111111'),
      MANY: aps(6, -40, '22222222'),
    },
    readings: [...aps(2, -40, '11111111'), ...aps(6, -40, '22222222')],
  })

  assert.equal(match.best.nodeId, 'MANY')
  assert.ok(match.candidates.length >= 2)
  assert.ok(match.candidates[0].score >= match.candidates[1].score)
})

test('coverage records how much of the scan a node explains', () => {
  const match = matchFingerprints({
    fingerprints: {
      PARTIAL: aps(2, -40, '11111111'),
      FULL: aps(6, -40, '22222222'),
    },
    readings: [...aps(2, -40, '11111111'), ...aps(6, -40, '22222222')],
  })

  const partial = match.candidates.find((entry) => entry.nodeId === 'PARTIAL')

  assert.equal(match.knownCount, 8)
  assert.equal(partial.matches, 2)
  assert.equal(partial.coverage, 0.25)
})

test('separation distinguishes two rooms that look identical', () => {
  const fingerprints = { ROOM_A: aps(6, -40, '11111111'), ROOM_B: aps(6, -40, '22222222') }

  const both = matchFingerprints({
    fingerprints,
    readings: [...aps(6, -40, '11111111'), ...aps(6, -40, '22222222')],
  })

  const single = matchFingerprints({ fingerprints, readings: aps(6, -40, '11111111') })

  assert.ok(
    single.confidence > both.confidence,
    'a clear winner should be more confident than a tie',
  )
})

test('the candidate list is capped', () => {
  const fingerprints = {}

  for (let index = 0; index < 20; index += 1) {
    fingerprints[`NODE_${index}`] = aps(5, -40, `0000000${index % 10}`)
  }

  const match = matchFingerprints({ fingerprints, readings: aps(5) })

  assert.ok(match.candidates.length <= 5)
})

test('a non-default sigma changes how strict the fit is', () => {
  const fingerprints = { NODE_A: aps(5, -40) }
  const readings = aps(5, -50)

  const tight = matchFingerprints({ fingerprints, readings, sigma: 2 })
  const loose = matchFingerprints({ fingerprints, readings, sigma: 20 })

  assert.ok(tight.best.fit < loose.best.fit)
  assert.equal(DEFAULT_SIGMA, 6)
})

test('getConfidenceLabel uses the published thresholds', () => {
  assert.equal(getConfidenceLabel(100), 'high')
  assert.equal(getConfidenceLabel(CONFIDENCE_HIGH), 'high')
  assert.equal(getConfidenceLabel(CONFIDENCE_HIGH - 1), 'medium')
  assert.equal(getConfidenceLabel(CONFIDENCE_MEDIUM), 'medium')
  assert.equal(getConfidenceLabel(CONFIDENCE_MEDIUM - 1), 'low')
  assert.equal(getConfidenceLabel(0), 'low')
})
