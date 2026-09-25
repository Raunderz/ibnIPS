import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getDirectionLabel,
  getMapViewState,
  MAP_STATES,
} from '../src/map/mapViewState.js'
import { searchNodes } from '../src/utils/searchNodes.js'
import {
  getFloorCountLabel,
  getFloorLabel,
  getLocationCountLabel,
  getLocationTitle,
} from '../src/utils/location.js'

const nodes = [
  { nodeId: '3c_157_f1', name: '3C-157', floor: 1, x: 0, y: 0 },
  { nodeId: '3c_156_f1', name: '3C-156', floor: 1, x: 40, y: 0 },
  { nodeId: 'lib_f2', name: 'Library', floor: 2, x: 0, y: 40 },
]

test('getMapViewState decides what the map screen renders', () => {
  assert.equal(getMapViewState({ isPending: true, nodeCount: 10 }), MAP_STATES.loading)
  assert.equal(getMapViewState({ isError: true, nodeCount: 10 }), MAP_STATES.error)
  assert.equal(getMapViewState({ isPending: true, isError: true }), MAP_STATES.loading)
  assert.equal(getMapViewState({ nodeCount: 0 }), MAP_STATES.empty)
  assert.equal(getMapViewState({ nodeCount: 1 }), MAP_STATES.ready)
  assert.equal(getMapViewState(), MAP_STATES.empty)
})

test('getDirectionLabel only trusts stored compass values', () => {
  assert.equal(getDirectionLabel('NE'), 'head NE')
  assert.equal(getDirectionLabel(''), 'continue straight')
  assert.equal(getDirectionLabel(undefined), 'continue straight')
})

test('searchNodes matches names, ids, and spaced ids', () => {
  assert.deepEqual(searchNodes(nodes, ''), [])
  assert.deepEqual(
    searchNodes(nodes, '157').map((node) => node.nodeId),
    ['3c_157_f1'],
  )
  assert.equal(searchNodes(nodes, '3c').length, 2)
  assert.equal(searchNodes(nodes, '3c 156').length, 1)
  assert.equal(searchNodes(nodes, 'f2').length, 1)
  assert.equal(searchNodes(nodes, 'room').length, 0)
  assert.equal(searchNodes(nodes, '3c 157 library').length, 0)
  assert.deepEqual(
    searchNodes(nodes, '3c').map((node) => node.name),
    ['3C-156', '3C-157'],
  )
  assert.equal(searchNodes(nodes, '3c', 1).length, 1)
})

test('location labels stay honest about missing data', () => {
  assert.equal(getFloorLabel(1), 'Floor 1')
  assert.equal(getFloorLabel('x'), 'Floor unavailable')
  assert.equal(getLocationTitle(null), 'Unknown location')
  assert.equal(getLocationTitle({ name: '  3C-157 ', nodeId: 'a' }), '3C-157')
  assert.equal(getLocationTitle({ name: '', nodeId: 'a_f1' }), 'a_f1')
  assert.equal(getLocationCountLabel(1), '1 location')
  assert.equal(getLocationCountLabel(16), '16 locations')
  assert.equal(getFloorCountLabel(1), '1 floor')
  assert.equal(getFloorCountLabel(2), '2 floors')
})
