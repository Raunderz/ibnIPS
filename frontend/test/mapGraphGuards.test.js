import assert from 'node:assert/strict'
import test from 'node:test'
import {
  findRoute,
  getAdjacency,
  getConnectedLinks,
  getFloorEdges,
  getFloorNodes,
  getFloors,
  getFloorCounts,
  getNodesById,
  getRouteFloors,
  getRouteNodeSet,
  getRoutePathsByFloor,
  sortNodes,
} from '../src/map/mapGraph.js'

const nodesByIdOf = (entries) =>
  new Map(entries.map((entry) => [entry.nodeId, entry]))

test('route helpers survive a route with no nodeIds array', () => {
  const nodes = [{ nodeId: 'a', name: 'A', floor: 1, x: 0, y: 0 }]
  const nodesById = nodesByIdOf(nodes)

  assert.deepEqual([...getRouteNodeSet({ totalSteps: 3 })], [])
  assert.equal(getRoutePathsByFloor({ totalSteps: 3 }, nodesById).size, 0)
  assert.deepEqual(getRouteFloors({ totalSteps: 3 }, nodesById), [])
})

test('route helpers survive a missing nodesById map', () => {
  const route = { nodeIds: ['a', 'b'], segments: [], totalSteps: 4 }

  assert.equal(getRoutePathsByFloor(route, null).size, 0)
  assert.deepEqual(getRouteFloors(route, undefined), [])
})

test('orphan edges produce an empty route floor list instead of throwing', () => {
  // Edges can reference rooms the node list no longer publishes.
  const route = { nodeIds: ['gone_a', 'gone_b'], segments: [], totalSteps: 10 }

  assert.deepEqual(getRouteFloors(route, nodesByIdOf([])), [])
  assert.equal(getRoutePathsByFloor(route, nodesByIdOf([])).size, 0)
})

test('graph helpers accept missing or non-array input', () => {
  assert.deepEqual(sortNodes(undefined), [])
  assert.deepEqual(getFloors(undefined), [])
  assert.equal(getFloorCounts(undefined).size, 0)
  assert.deepEqual(getFloorNodes(undefined, 1), [])
  assert.deepEqual(getFloorEdges(undefined, new Set()), [])
  assert.equal(getAdjacency(undefined).size, 0)
  assert.deepEqual(getConnectedLinks(undefined, 'a'), [])
  assert.deepEqual(getNodesById(undefined).size, 0)
})

test('getAdjacency skips malformed edges', () => {
  const adjacency = getAdjacency([
    null,
    { fromNode: 'a' },
    { fromNode: 5, toNode: 6 },
    { fromNode: 'a', toNode: 'b', steps: 4, direction: 'E' },
  ])

  assert.deepEqual([...adjacency.keys()].sort(), ['a', 'b'])
  assert.equal(adjacency.get('a')[0].nodeId, 'b')
})

test('getNodesById ignores entries with no usable id', () => {
  const nodesById = getNodesById([null, { nodeId: 'a' }, { name: 'no id' }])

  assert.deepEqual([...nodesById.keys()], ['a'])
})

test('findRoute treats a missing step count as zero cost', () => {
  const route = findRoute(
    [{ fromNode: 'a', toNode: 'b' }, { fromNode: 'b', toNode: 'c' }],
    'a',
    'c',
  )

  assert.deepEqual(route.nodeIds, ['a', 'b', 'c'])
  assert.equal(route.totalSteps, 0)
})

test('getConnectedLinks sorts unknown step counts to the front without NaN', () => {
  const links = getConnectedLinks(
    [
      { fromNode: 'a', toNode: 'b', steps: 12 },
      { fromNode: 'c', toNode: 'a' },
    ],
    'a',
  )

  assert.deepEqual(
    links.map((link) => link.steps),
    [0, 12],
  )
})
