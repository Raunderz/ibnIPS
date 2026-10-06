import assert from 'node:assert/strict'
import test from 'node:test'
import {
  findRoute,
  getFloorCounts,
  getFloorEdges,
  getFloorNodes,
  getFloors,
  getRouteFloors,
  getRoutePathsByFloor,
  getNodesById,
  sortNodes,
} from '../src/map/mapGraph.js'

function node(nodeId, floor = 1, name = nodeId, x = 0, y = 0) {
  return { nodeId, name, floor, x, y }
}

function edge(fromNode, toNode, steps = 1, direction = 'E') {
  return { fromNode, toNode, steps, direction }
}

/**
 *   A --1-- B --1-- C
 *        \          /
 *         ---5------ D
 */
const NODES = [
  node('A'),
  node('B'),
  node('C'),
  node('D'),
]

const EDGES = [
  edge('A', 'B', 1, 'E'),
  edge('B', 'C', 1, 'E'),
  edge('B', 'D', 5, 'SE'),
  edge('C', 'D', 2, 'S'),
]

test('getFloors reports each floor once, in order', () => {
  const nodes = [node('A', 2), node('B', 1), node('C', 2), node('D', 1)]

  assert.deepEqual(getFloors(nodes), [1, 2])
})

test('getFloorCounts counts nodes per floor', () => {
  const nodes = [node('A', 1), node('B', 2), node('C', 1)]
  const counts = getFloorCounts(nodes)

  assert.equal(counts.get(1), 2)
  assert.equal(counts.get(2), 1)
})

test('getFloorNodes keeps only the requested floor', () => {
  const nodes = [node('A', 1), node('B', 2), node('C', 1)]

  assert.deepEqual(
    getFloorNodes(nodes, 1).map((entry) => entry.nodeId),
    ['A', 'C'],
  )
})

test('getFloorEdges drops edges that leave the floor', () => {
  const nodes = getFloorNodes(NODES, 1)
  const edges = getFloorEdges(EDGES, new Set(nodes.map((entry) => entry.nodeId)))

  assert.equal(edges.length, EDGES.length)
})

test('getFloorEdges keeps only edges with both ends in the given set', () => {
  const edges = [edge('A', 'B', 1), edge('B', 'C', 1)]
  const floorOne = getFloorNodes([node('A', 1), node('B', 1), node('C', 2)], 1)
  const filtered = getFloorEdges(edges, new Set(floorOne.map((entry) => entry.nodeId)))

  assert.deepEqual(filtered, [edge('A', 'B', 1)])
})

test('sortNodes orders by floor, then numerically by name', () => {
  const nodes = [node('C', 1, 'Room 9'), node('A', 1, 'Room 10'), node('B', 2, 'Room 2')]

  // A lexical sort would put "Room 10" first; numeric ordering puts 9 before 10.
  assert.deepEqual(
    sortNodes(nodes).map((entry) => entry.name),
    ['Room 9', 'Room 10', 'Room 2'],
  )
})

test('getNodesById indexes by node id', () => {
  const lookup = getNodesById(NODES)

  assert.equal(lookup.get('C').nodeId, 'C')
  assert.equal(lookup.size, 4)
})

test('findRoute returns no route without both ends', () => {
  assert.equal(findRoute(EDGES, null, 'C'), null)
  assert.equal(findRoute(EDGES, 'A', null), null)
  assert.equal(findRoute(EDGES, 'A', undefined), null)
})

test('findRoute treats a room as already arrived', () => {
  const route = findRoute(EDGES, 'A', 'A')

  assert.deepEqual(route.nodeIds, ['A'])
  assert.equal(route.totalSteps, 0)
  assert.equal(route.segments.length, 0)
})

test('findRoute picks the cheaper of two paths', () => {
  const route = findRoute(EDGES, 'A', 'D')

  assert.deepEqual(route.nodeIds, ['A', 'B', 'C', 'D'])
  assert.equal(route.totalSteps, 4)
})

test('findRoute walks edges in reverse', () => {
  const route = findRoute(EDGES, 'C', 'A')

  assert.deepEqual(route.nodeIds, ['C', 'B', 'A'])
  assert.equal(route.totalSteps, 2)
})

test('reverse legs are flagged so instructions face the right way', () => {
  const forward = findRoute(EDGES, 'A', 'B')
  const backward = findRoute(EDGES, 'B', 'A')

  assert.equal(forward.segments[0].forward, true)
  assert.equal(backward.segments[0].forward, false)
})

test('a directed route may refuse to run backwards', () => {
  assert.equal(findRoute(EDGES, 'B', 'A', { directed: true }), null)
})

test('findRoute reports no connection between separate components', () => {
  const isolated = [...EDGES]

  assert.equal(findRoute(isolated, 'A', 'MISSING'), null)
})

test('getRouteFloors lists every floor the route touches, in order', () => {
  const nodes = [node('A', 1), node('B', 2)]
  const edges = [edge('A', 'B', 1)]
  const route = findRoute(edges, 'A', 'B')

  assert.deepEqual(getRouteFloors(route, getNodesById(nodes)), [1, 2])
})

test('getRoutePathsByFloor draws one path per floor and skips the stairs', () => {
  const nodes = [node('A', 1, 'A', 0, 0), node('B', 1, 'B', 10, 0), node('C', 2, 'C', 20, 5)]
  const edges = [edge('A', 'B', 1), edge('B', 'C', 1)]
  const route = findRoute(edges, 'A', 'C')
  const paths = getRoutePathsByFloor(route, getNodesById(nodes))

  assert.equal(paths.get(1), 'M0 0 L10 0')
  assert.equal(paths.has(2), false)
})

test('getRoutePathsByFloor is empty for a route with no legs', () => {
  const paths = getRoutePathsByFloor(
    { nodeIds: ['A'], segments: [] },
    getNodesById(NODES),
  )

  assert.equal(paths.size, 0)
})

test('findRoute terminates on a cycle and relaxes a cheaper path', () => {
  // The direct A-C link is expensive, so the cheap way round the cycle wins.
  const edges = [edge('A', 'B', 1), edge('B', 'C', 1), edge('C', 'A', 10)]
  const route = findRoute(edges, 'A', 'C')

  assert.deepEqual(route.nodeIds, ['A', 'B', 'C'])
  assert.equal(route.totalSteps, 2)
})

test('findRoute takes the direct link when it is the cheapest', () => {
  const edges = [edge('A', 'B', 1), edge('B', 'C', 1), edge('C', 'A', 1)]
  const route = findRoute(edges, 'A', 'C')

  assert.deepEqual(route.nodeIds, ['A', 'C'])
  assert.equal(route.totalSteps, 1)
})
