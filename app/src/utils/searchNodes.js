function normalize(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function scorePart(part, name, nodeId, spacedId) {
  if (name === part) {
    return 100
  }

  if (name.startsWith(part)) {
    return 80
  }

  if (name.includes(part)) {
    return 60
  }

  if (nodeId === part) {
    return 55
  }

  if (nodeId.includes(part)) {
    return 40
  }

  if (spacedId.includes(part)) {
    return 35
  }

  return 0
}

export function searchNodes(nodes, query, limit = 60) {
  const term = normalize(query)

  if (!term) {
    return []
  }

  const parts = term.split(/\s+/).filter(Boolean)
  const matches = []

  for (const node of nodes) {
    const name = normalize(node.name)
    const nodeId = normalize(node.nodeId)
    const spacedId = nodeId.replace(/[_-]+/g, ' ')
    let score = 0
    let matchedEveryPart = true

    for (const part of parts) {
      const partScore = scorePart(part, name, nodeId, spacedId)

      if (partScore === 0) {
        matchedEveryPart = false
        break
      }

      score += partScore
    }

    if (matchedEveryPart) {
      matches.push({ node, score })
    }
  }

  matches.sort(
    (first, second) =>
      second.score - first.score ||
      first.node.name.localeCompare(second.node.name, undefined, {
        numeric: true,
      }) ||
      first.node.floor - second.node.floor,
  )

  return matches.slice(0, limit).map((match) => match.node)
}
