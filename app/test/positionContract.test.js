import assert from 'node:assert/strict'
import test from 'node:test'
import {
  PositionContractError,
  parsePositionResponse,
} from '../src/positioning/positionContract.js'

function rawPosition(overrides = {}) {
  return {
    x: -400,
    y: -60,
    floor: 2,
    node_id: 'lab_201_f2',
    name: 'Lab 201',
    confidence: 88,
    confidence_level: 'High',
    samples: 12,
    ...overrides,
  }
}

test('a position is parsed into the app vocabulary', () => {
  const parsed = parsePositionResponse(rawPosition())

  assert.equal(parsed.nodeId, 'lab_201_f2')
  assert.equal(parsed.name, 'Lab 201')
  assert.equal(parsed.floor, 2)
  assert.equal(parsed.x, -400)
  assert.equal(parsed.y, -60)
  assert.equal(parsed.confidence, 88)
  assert.equal(parsed.confidenceLabel, 'high')
  assert.equal(parsed.samples, 12)
})

test('a 0,0 pair is reported as an unplaced room', () => {
  const parsed = parsePositionResponse(rawPosition({ x: 0, y: 0 }))

  assert.equal(parsed.hasServerCoordinates, false)
})

test('a real coordinate pair is marked as placed', () => {
  const parsed = parsePositionResponse(rawPosition({ x: 0, y: 40 }))

  assert.equal(parsed.hasServerCoordinates, true)
})

test('the server confidence label is lower-cased', () => {
  for (const [server, expected] of [
    ['High', 'high'],
    ['Medium', 'medium'],
    ['Low', 'low'],
    ['Uncertain', 'uncertain'],
  ]) {
    const parsed = parsePositionResponse(rawPosition({ confidence_level: server }))

    assert.equal(parsed.confidenceLabel, expected)
  }
})

test('Uncertain borrows the low badge tone', () => {
  const parsed = parsePositionResponse(
    rawPosition({ confidence: 12, confidence_level: 'Uncertain' }),
  )

  assert.equal(parsed.confidenceLabel, 'uncertain')
  assert.equal(parsed.confidenceTone, 'low')
})

test('an unknown label falls back to the confidence value', () => {
  const parsed = parsePositionResponse(
    rawPosition({ confidence: 80, confidence_level: 'Excellent' }),
  )

  assert.equal(parsed.confidenceLabel, 'high')
})

test('a missing label is derived from the confidence', () => {
  assert.equal(
    parsePositionResponse(rawPosition({ confidence: 55, confidence_level: undefined }))
      .confidenceLabel,
    'medium',
  )

  assert.equal(
    parsePositionResponse(rawPosition({ confidence: 35, confidence_level: undefined }))
      .confidenceLabel,
    'low',
  )

  assert.equal(
    parsePositionResponse(rawPosition({ confidence: 5, confidence_level: undefined }))
      .confidenceLabel,
    'uncertain',
  )
})

test('numeric strings from JSON are accepted', () => {
  const parsed = parsePositionResponse(
    rawPosition({ x: '-400', y: '-60', floor: '2', confidence: '88', samples: '12' }),
  )

  assert.equal(parsed.x, -400)
  assert.equal(parsed.floor, 2)
  assert.equal(parsed.confidence, 88)
  assert.equal(parsed.samples, 12)
})

test('a missing name is allowed', () => {
  const parsed = parsePositionResponse(rawPosition({ name: undefined }))

  assert.equal(parsed.name, '')
})

test('a non-object payload is rejected', () => {
  assert.throws(() => parsePositionResponse(null), PositionContractError)
  assert.throws(() => parsePositionResponse('lab_201'), PositionContractError)
  assert.throws(() => parsePositionResponse([1, 2]), PositionContractError)
})

test('a missing or blank node id is rejected', () => {
  assert.throws(
    () => parsePositionResponse(rawPosition({ node_id: undefined })),
    PositionContractError,
  )
  assert.throws(
    () => parsePositionResponse(rawPosition({ node_id: '   ' })),
    /node_id/,
  )
})

test('non-numeric coordinates are rejected', () => {
  assert.throws(
    () => parsePositionResponse(rawPosition({ x: 'left' })),
    /coordinates/,
  )
  assert.throws(
    () => parsePositionResponse(rawPosition({ y: null })),
    /coordinates/,
  )
})

test('a non-numeric floor is rejected', () => {
  assert.throws(
    () => parsePositionResponse(rawPosition({ floor: 'ground' })),
    /floor/,
  )
})