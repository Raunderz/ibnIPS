const adjacencyCache = new WeakMap()

class MinHeap {
  constructor() {
    this.items = []
  }

  get size() {
    return this.items.length
  }

  push(id, priority) {
    const items = this.items
    items.push({ id, priority })
    let index = items.length - 1

    while (index > 0) {
      const parent = (index - 1) >> 1

      if (items[parent].priority <= items[index].priority) {
        break
      }

      const swap = items[parent]
      items[parent] = items[index]
      items[index] = swap
      index = parent
    }
  }

  pop() {
    const items = this.items

    if (items.length === 0) {
      return null
    }

    const top = items[0]
    const last = items.pop()

    if (items.length > 0) {
      items[0] = last
      let index = 0

      for (;;) {
        const left = index * 2 + 1
        const right = left + 1
        let smallest = index

        if (left < items.length && items[left].priority < items[smallest].priority) {
          smallest = left
        }

        if (right < items.length && items[right].priority < items[smallest].priority) {
          smallest = right
        }

        if (smallest === index) {
          break
        }

        const swap = items[index]
        items[index] = items[smallest]
        items[smallest] = swap
        index = smallest
      }
    }

    return top
  }
}

export function sortNodes(nodes) {
  if (!Array.isArray(nodes)) {
    return []
  }

  return [...nodes].sort(
    (first, second) =>
      first.floor - second.floor ||
      first.name.localeCompare(second.name, undefined, { numeric: true }) ||
      first.nodeId.localeCompare(second.nodeId),
  )
}

export function getFloors(nodes) {
  const floors = new Set()

  for (const node of Array.isArray(nodes) ? nodes : []) {
    floors.add(node.floor)
  }

  return [...floors].sort((first, second) => first - second)
}

export function getFloorCounts(nodes) {
  const counts = new Map()

  for (const node of Array.isArray(nodes) ? nodes : []) {
    counts.set(node.floor, (counts.get(node.floor) ?? 0) + 1)
  }

  return new Map(
    getFloors(nodes).map((floor) => [floor, counts.get(floor) ?? 0]),
  )
}

export function getFloorNodes(nodes, floor) {
  if (!Array.isArray(nodes)) {
    return []
  }

  return nodes.filter((node) => node.floor === floor)
}

export function getFloorEdges(edges, nodeIds) {
  if (!Array.isArray(edges) || !nodeIds) {
    return []
  }

  return edges.filter(
    (edge) => nodeIds.has(edge.fromNode) && nodeIds.has(edge.toNode),
  )
}

export function isPositioned(node) {
  return node.x !== 0 || node.y !== 0
}

export function getNodesById(nodes) {
  const nodesById = new Map()

  for (const node of Array.isArray(nodes) ? nodes : []) {
    if (node && typeof node.nodeId === 'string') {
      nodesById.set(node.nodeId, node)
    }
  }

  return nodesById
}

export function getAdjacency(edges) {
  if (!Array.isArray(edges)) {
    return new Map()
  }

  const cached = adjacencyCache.get(edges)

  if (cached) {
    return cached
  }

  const adjacency = new Map()

  for (const edge of edges) {
    if (!edge || typeof edge.fromNode !== 'string' || typeof edge.toNode !== 'string') {
      continue
    }

    if (!adjacency.has(edge.fromNode)) {
      adjacency.set(edge.fromNode, [])
    }

    if (!adjacency.has(edge.toNode)) {
      adjacency.set(edge.toNode, [])
    }

    adjacency.get(edge.fromNode).push({
      nodeId: edge.toNode,
      steps: edge.steps,
      direction: edge.direction,
      forward: true,
    })
    adjacency.get(edge.toNode).push({
      nodeId: edge.fromNode,
      steps: edge.steps,
      direction: edge.direction,
      forward: false,
    })
  }

  adjacencyCache.set(edges, adjacency)

  return adjacency
}

export function findRoute(edges, fromNodeId, toNodeId, options = {}) {
  const { directed = false } = options

  if (!fromNodeId || !toNodeId) {
    return null
  }

  if (fromNodeId === toNodeId) {
    return { nodeIds: [fromNodeId], segments: [], totalSteps: 0 }
  }

  const adjacency = getAdjacency(edges)

  if (!adjacency.has(fromNodeId) || !adjacency.has(toNodeId)) {
    return null
  }

  const distances = new Map([[fromNodeId, 0]])
  const previous = new Map()
  const visited = new Set()
  const queue = new MinHeap()
  queue.push(fromNodeId, 0)

  while (queue.size > 0) {
    const current = queue.pop()

    if (!current || visited.has(current.id)) {
      continue
    }

    visited.add(current.id)

    if (current.id === toNodeId) {
      break
    }

    for (const link of adjacency.get(current.id)) {
      if (directed && !link.forward) {
        continue
      }

      const cost = Number.isFinite(link.steps) ? Math.max(0, link.steps) : 0
      const candidate = current.priority + cost
      const known = distances.get(link.nodeId)

      if (known !== undefined && candidate >= known) {
        continue
      }

      distances.set(link.nodeId, candidate)
      previous.set(link.nodeId, { from: current.id, link })
      queue.push(link.nodeId, candidate)
    }
  }

  if (!visited.has(toNodeId)) {
    return null
  }

  const nodeIds = [toNodeId]
  const segments = []
  let cursor = toNodeId

  while (cursor !== fromNodeId) {
    const step = previous.get(cursor)

    if (!step) {
      return null
    }

    segments.unshift({
      fromNodeId: step.from,
      toNodeId: cursor,
      steps: step.link.steps,
      direction: step.link.direction,
      forward: step.link.forward,
    })
    cursor = step.from
    nodeIds.unshift(cursor)
  }

  return { nodeIds, segments, totalSteps: distances.get(toNodeId) ?? 0 }
}

function getRouteNodeIds(route) {
  return Array.isArray(route?.nodeIds) ? route.nodeIds : []
}

export function getRouteNodeSet(route) {
  return new Set(getRouteNodeIds(route))
}

export function getRoutePathsByFloor(route, nodesById) {
  const pathsByFloor = new Map()
  const nodeIds = getRouteNodeIds(route)

  if (nodeIds.length < 2 || !nodesById) {
    return pathsByFloor
  }

  for (let index = 1; index < nodeIds.length; index += 1) {
    const from = nodesById.get(nodeIds[index - 1])
    const to = nodesById.get(nodeIds[index])

    if (!from || !to || from.floor !== to.floor) {
      continue
    }

    const commands = pathsByFloor.get(from.floor) ?? ''
    const head = commands === '' ? `M${from.x} ${from.y}` : `L${from.x} ${from.y}`
    pathsByFloor.set(from.floor, `${head} L${to.x} ${to.y}`)
  }

  return pathsByFloor
}

export function getRouteFloors(route, nodesById) {
  const floors = new Set()

  if (!nodesById) {
    return []
  }

  for (const nodeId of getRouteNodeIds(route)) {
    const node = nodesById.get(nodeId)

    if (node) {
      floors.add(node.floor)
    }
  }

  return [...floors].sort((first, second) => first - second)
}

export function getConnectedLinks(edges, nodeId) {
  const links = []

  if (!Array.isArray(edges) || !nodeId) {
    return links
  }

  const seen = new Set()

  for (const edge of edges) {
    if (!edge) {
      continue
    }

    const outbound = edge.fromNode === nodeId
    const inbound = edge.toNode === nodeId

    if (!outbound && !inbound) {
      continue
    }

    const neighborId = outbound ? edge.toNode : edge.fromNode

    if (seen.has(neighborId)) {
      continue
    }

    seen.add(neighborId)
    links.push({
      neighborId,
      steps: Number.isFinite(edge.steps) ? edge.steps : 0,
      direction: outbound ? edge.direction : '',
      outbound,
    })
  }

  return links.sort((first, second) => first.steps - second.steps)
}
