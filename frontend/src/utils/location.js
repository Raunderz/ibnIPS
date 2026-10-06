export function getFloorLabel(floor) {
  return Number.isInteger(floor) ? `Floor ${floor}` : 'Floor unavailable'
}

export function getLocationTitle(node) {
  if (!node) {
    return 'Unknown location'
  }

  const name = typeof node.name === 'string' ? node.name.trim() : ''

  return name || node.nodeId || 'Unknown location'
}

export function getLocationCountLabel(count) {
  return `${count} location${count === 1 ? '' : 's'}`
}

export function getFloorCountLabel(count) {
  return `${count} floor${count === 1 ? '' : 's'}`
}

export function getUserInitials(userId) {
  if (typeof userId !== 'string') {
    return 'U'
  }

  const trimmed = userId.trim()

  if (!trimmed) {
    return 'U'
  }

  return trimmed.slice(0, 2).toUpperCase()
}
