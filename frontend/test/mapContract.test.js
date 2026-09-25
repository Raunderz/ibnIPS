import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MapContractError,
  parseMapResponse,
  parseNodeList,
} from '../src/map/mapContract.js'

// Shape copied from the live GET /api/map payload (raw map.json passthrough).
const liveMap = {
  nodes: [
    { node_id: '3c_157_f1', name: '3C-157', floor: 1, x: -400, y: -60 },
    { node_id: '3c_156_f1', name: '3C-156', floor: 1, x: -320, y: -60 },
  ],
  edges: [
    { from_node: '3c_157_f1', to_node: '3c_156_f1', steps: 10, direction: 'E' },
  ],
  fingerprints: {
    '3c_157_f1': [
      { bssid: 'a8:5b:f7:26:bd:d0', ssid: 'KIIT-WIFI-NET.', rssi: -96 },
    ],
  },
}

test('parseMapResponse keeps only the fields the map screen needs', () => {
  const map = parseMapResponse(liveMap)

  assert.deepEqual(map.nodes[0], {
    nodeId: '3c_157_f1',
    name: '3C-157',
    floor: 1,
    x: -400,
    y: -60,
  })
  assert.deepEqual(map.edges[0], {
    fromNode: '3c_157_f1',
    toNode: '3c_156_f1',
    steps: 10,
    direction: 'E',
  })
  assert.equal(map.fingerprints['3c_157_f1'].length, 1)
})

test('parseMapResponse accepts the exporter shape without fingerprints', () => {
  const map = parseMapResponse({ nodes: liveMap.nodes, edges: liveMap.edges })

  assert.deepEqual(map.fingerprints, {})
  assert.equal(map.nodes.length, 2)
})

test('parseMapResponse keeps the exporter empty direction value', () => {
  const map = parseMapResponse({
    nodes: liveMap.nodes,
    edges: [{ ...liveMap.edges[0], direction: '' }],
  })

  assert.equal(map.edges[0].direction, '')
})

test('parseMapResponse rejects payloads the map cannot draw', () => {
  assert.throws(() => parseMapResponse(null), MapContractError)
  assert.throws(() => parseMapResponse({ nodes: [] }), MapContractError)
  assert.throws(
    () => parseMapResponse({ nodes: liveMap.nodes, edges: [{ ...liveMap.edges[0], steps: 4.5 }] }),
    MapContractError,
  )
  assert.throws(
    () => parseMapResponse({ nodes: liveMap.nodes, edges: [{ ...liveMap.edges[0], direction: 'NE-ish' }] }),
    MapContractError,
  )
  assert.throws(
    () => parseMapResponse({ nodes: [{ ...liveMap.nodes[0], x: '0' }], edges: [] }),
    MapContractError,
  )
  assert.throws(
    () => parseMapResponse({ ...liveMap, fingerprints: { '3c_157_f1': [{ bssid: 'x' }] } }),
    MapContractError,
  )
  assert.throws(
    () => parseMapResponse({ ...liveMap, fingerprints: { '3c_157_f1': 'nope' } }),
    MapContractError,
  )
})

test('parseNodeList validates the /api/nodes rows', () => {
  assert.deepEqual(parseNodeList([]), [])
  assert.deepEqual(parseNodeList([{ node_id: 'a_f1', name: 'A', floor: 1, x: 0, y: 0 }]), [
    { nodeId: 'a_f1', name: 'A', floor: 1, x: 0, y: 0 },
  ])
  assert.throws(() => parseNodeList({}), MapContractError)
  assert.throws(
    () => parseNodeList([{ node_id: 'a_f1', name: 'A', floor: 1, x: 1 }]),
    MapContractError,
  )
})
