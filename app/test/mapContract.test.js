import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MapContractError,
  parseMapResponse,
  parseNodeList,
} from '../src/map/mapContract.js'

function rawNode(nodeId, name = nodeId, floor = 1) {
  return { node_id: nodeId, name, floor, x: 1, y: 2 }
}

function rawEdge(fromNode, toNode, steps = 1, direction = 'E') {
  return { from_node: fromNode, to_node: toNode, steps, direction }
}

test('a map is parsed into camelCase nodes and edges', () => {
  const parsed = parseMapResponse({
    nodes: [rawNode('3C-157', 'Lecture Hall')],
    edges: [rawEdge('3C-157', '3C-158')],
  })

  assert.deepEqual(parsed.nodes[0], {
    nodeId: '3C-157',
    name: 'Lecture Hall',
    floor: 1,
    x: 1,
    y: 2,
  })
  assert.deepEqual(parsed.edges[0], {
    fromNode: '3C-157',
    toNode: '3C-158',
    steps: 1,
    direction: 'E',
  })
})

test('a map with no fingerprints is still usable', () => {
  const parsed = parseMapResponse({ nodes: [rawNode('A')], edges: [] })

  assert.deepEqual(parsed.fingerprints, {})
})

test('fingerprints are grouped by node id', () => {
  const parsed = parseMapResponse({
    nodes: [rawNode('A')],
    edges: [],
    fingerprints: {
      A: [{ bssid: 'aa:bb:cc:dd:ee:01', ssid: 'campus', rssi: -50 }],
    },
  })

  assert.equal(parsed.fingerprints.A.length, 1)
  assert.equal(parsed.fingerprints.A[0].rssi, -50)
})

test('an empty fingerprint list is allowed', () => {
  const parsed = parseMapResponse({
    nodes: [rawNode('A')],
    edges: [],
    fingerprints: { A: [] },
  })

  assert.deepEqual(parsed.fingerprints.A, [])
})

test('a non-object map is rejected', () => {
  assert.throws(() => parseMapResponse('nope'), MapContractError)
  assert.throws(() => parseMapResponse(null), MapContractError)
  assert.throws(() => parseMapResponse([1, 2]), MapContractError)
})

test('a map missing nodes or edges is rejected', () => {
  assert.throws(() => parseMapResponse({ nodes: [] }), MapContractError)
  assert.throws(() => parseMapResponse({ edges: [] }), MapContractError)
  assert.throws(() => parseMapResponse({ nodes: {}, edges: [] }), MapContractError)
})

test('a node missing an id is rejected', () => {
  const broken = { name: 'x', floor: 1, x: 0, y: 0 }

  assert.throws(
    () => parseMapResponse({ nodes: [rawNode('A'), broken], edges: [] }),
    MapContractError,
  )
  assert.throws(
    () => parseMapResponse({ nodes: [rawNode('A'), broken], edges: [] }),
    /node_id/,
  )
})

test('a non-integer coordinate is rejected', () => {
  const broken = { ...rawNode('A'), x: '1' }

  assert.throws(() => parseMapResponse({ nodes: [broken], edges: [] }), MapContractError)
})

test('an unknown compass direction is rejected', () => {
  assert.throws(
    () => parseMapResponse({ nodes: [rawNode('A')], edges: [rawEdge('A', 'B', 1, 'NNE')] }),
    /NNE/,
  )
})

test('an empty direction is allowed for bidirectional links', () => {
  const parsed = parseMapResponse({
    nodes: [rawNode('A')],
    edges: [rawEdge('A', 'B', 1, '')],
  })

  assert.equal(parsed.edges[0].direction, '')
})

test('every compass direction is accepted', () => {
  for (const direction of ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']) {
    const parsed = parseMapResponse({
      nodes: [rawNode('A')],
      edges: [rawEdge('A', 'B', 1, direction)],
    })

    assert.equal(parsed.edges[0].direction, direction)
  }
})

test('a fingerprints value of the wrong type is rejected', () => {
  assert.throws(
    () => parseMapResponse({ nodes: [rawNode('A')], edges: [], fingerprints: [] }),
    /object/,
  )
  assert.throws(
    () => parseMapResponse({ nodes: [rawNode('A')], edges: [], fingerprints: { A: 'x' } }),
    /array/,
  )
})

test('the standalone node list is parsed on its own', () => {
  const nodes = parseNodeList([rawNode('A'), rawNode('B')])

  assert.equal(nodes.length, 2)
  assert.throws(() => parseNodeList({ nodes: [] }), MapContractError)
})
