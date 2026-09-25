import assert from 'node:assert/strict'
import test from 'node:test'
import {
  findRoute,
  getAdjacency,
  getConnectedLinks,
  getFloorCounts,
  getFloorEdges,
  getFloorNodes,
  getFloors,
  getRouteFloors,
  getRouteNodeSet,
  getRoutePathsByFloor,
  isPositioned,
  sortNodes,
} from '../src/map/mapGraph.js'

const node = (nodeId, floor, x, y, name = nodeId) => ({
  nodeId,
  name,
  floor,
  x,
  y,
})

const edge = (fromNode, toNode, steps, direction = '') => ({
  fromNode,
  toNode,
  steps,
  direction,
})

test('sortNodes orders by floor then natural name', () => {
  const sorted = sortNodes([
    node('b_f2', 2, 0, 0, 'B-2'),
    node('a_f1', 1, 0, 0, 'A-10'),
    node('c_f1', 1, 0, 0, 'C-2'),
  ])

  assert.deepEqual(
    sorted.map((entry) => entry.nodeId),
    ['a_f1', 'c_f1', 'b_f2'],
  )
})

test('getFloors returns sorted unique floors and counts match nodes', () => {
  const nodes = [
    node('a', 3, 0, 0),
    node('b', 1, 0, 0),
    node('c', 1, 0, 0),
  ]

  assert.deepEqual(getFloors(nodes), [1, 3])
  assert.deepEqual([...getFloorCounts(nodes).entries()], [
    [1, 2],
    [3, 1],
  ])
  assert.equal(getFloorNodes(nodes, 1).length, 2)
  assert.equal(getFloorNodes(nodes, 9).length, 0)
})

test('getFloorEdges keeps only edges inside the floor node set', () => {
  const edges = [edge('a', 'b', 5), edge('b', 'c', 7), edge('a', 'c', 9)]
  const ids = new Set(['a', 'b'])

  assert.deepEqual(getFloorEdges(edges, ids), [edge('a', 'b', 5)])
})

test('isPositioned flags the exporter 0,0 placeholder', () => {
  assert.equal(isPositioned(node('a', 1, 0, 0)), false)
  assert.equal(isPositioned(node('a', 1, 0, 5)), true)
})

test('getAdjacency is undirected, cached, and marks stored direction', () => {
  const edges = [edge('a', 'b', 10, 'E'), edge('b', 'c', 20, 'N')]

  const adjacency = getAdjacency(edges)

  assert.equal(getAdjacency(edges), adjacency, 'adjacency should be cached')
  assert.deepEqual(adjacency.get('a'), [
    { nodeId: 'b', steps: 10, direction: 'E', forward: true },
  ])
  assert.deepEqual(adjacency.get('b'), [
    { nodeId: 'a', steps: 10, direction: 'E', forward: false },
    { nodeId: 'c', steps: 20, direction: 'N', forward: true },
  ])
  assert.equal(adjacency.get('missing'), undefined)
})

test('findRoute returns the cheapest path using stored edge steps', () => {
  const edges = [
    edge('a', 'b', 10, 'E'),
    edge('b', 'd', 10, 'S'),
    edge('a', 'c', 30, 'S'),
    edge('c', 'd', 5, 'E'),
  ]

  const route = findRoute(edges, 'a', 'd')

  assert.deepEqual(route.nodeIds, ['a', 'b', 'd'])
  assert.equal(route.totalSteps, 20)
  assert.equal(route.segments.length, 2)
  assert.equal(route.segments[0].direction, 'E')
  assert.equal(route.segments[0].forward, true)
  assert.deepEqual([...getRouteNodeSet(route)], ['a', 'b', 'd'])
})

test('findRoute walks edges backwards and clears the heading', () => {
  const edges = [edge('a', 'b', 12, 'E')]

  const route = findRoute(edges, 'b', 'a')

  assert.deepEqual(route.nodeIds, ['b', 'a'])
  assert.equal(route.segments[0].forward, false)
  assert.equal(route.segments[0].direction, 'E')
  assert.equal(route.totalSteps, 12)
})

test('findRoute respects directed mode', () => {
  const edges = [edge('a', 'b', 5, 'E')]

  assert.notEqual(findRoute(edges, 'a', 'b', { directed: true }), null)
  assert.equal(findRoute(edges, 'b', 'a', { directed: true }), null)
})

test('findRoute handles same node, unknown nodes, and disconnection', () => {
  const edges = [edge('a', 'b', 5)]

  assert.deepEqual(findRoute(edges, 'a', 'a'), {
    nodeIds: ['a'],
    segments: [],
    totalSteps: 0,
  })
  assert.equal(findRoute(edges, 'a', 'zz'), null)
  assert.equal(findRoute(edges, null, 'a'), null)
  assert.equal(findRoute(edges, 'a', 'b', undefined) && findRoute([], 'a', 'b'), null)
})

test('findRoute survives a 4000 node grid without hanging', () => {
  const nodes = []
  const edges = []
  const size = 40

  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const id = `n_${row}_${column}`
      nodes.push(node(id, 1, column * 40, row * 40))

      if (column < size - 1) {
        edges.push(edge(id, `n_${row}_${column + 1}`, 10, 'E'))
      }

      if (row < size - 1) {
        edges.push(edge(id, `n_${row + 1}_${column}`, 10, 'S'))
      }
    }
  }

  const started = process.hrtime.bigint()
  const route = findRoute(edges, 'n_0_0', 'n_39_39')
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6

  assert.equal(route.nodeIds.length, 79)
  assert.equal(route.totalSteps, 780)
  assert.ok(elapsedMs < 250, `routing took ${elapsedMs.toFixed(1)}ms`)
  assert.equal(nodes.length, 1600)
})

test('getRoutePathsByFloor only draws same-floor segments', () => {
  const nodes = [
    node('a', 1, 0, 0),
    node('b', 1, 40, 0),
    node('c', 2, 40, 40),
  ]
  const nodesById = new Map(nodes.map((entry) => [entry.nodeId, entry]))
  const route = {
    nodeIds: ['a', 'b', 'c'],
    segments: [],
    totalSteps: 4,
  }

  const paths = getRoutePathsByFloor(route, nodesById)

  assert.equal(paths.size, 1)
  assert.equal(paths.get(1), 'M0 0 L40 0')
  assert.deepEqual(getRouteFloors(route, nodesById), [1, 2])
  assert.equal(getRoutePathsByFloor(null, nodesById).size, 0)
  assert.equal(getRoutePathsByFloor({ nodeIds: ['a'] }, nodesById).size, 0)
})

test('getConnectedLinks reports neighbours with real steps', () => {
  const edges = [edge('a', 'b', 20, 'E'), edge('c', 'a', 5, 'N')]
  const links = getConnectedLinks(edges, 'a')

  assert.deepEqual(links, [
    { neighborId: 'c', steps: 5, direction: '', outbound: false },
    { neighborId: 'b', steps: 20, direction: 'E', outbound: true },
  ])
})
