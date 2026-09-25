const COMPASS_DIRECTIONS = new Set([
  'N',
  'NE',
  'E',
  'SE',
  'S',
  'SW',
  'W',
  'NW',
])

export class MapContractError extends Error {
  constructor(message) {
    super(message)
    this.name = 'MapContractError'
    this.code = 'invalid_map_response'
  }
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function readString(value, field) {
  if (typeof value !== 'string') {
    throw new MapContractError(`Map ${field} must be a string.`)
  }

  return value
}

function readInteger(value, field) {
  if (!Number.isInteger(value)) {
    throw new MapContractError(`Map ${field} must be an integer.`)
  }

  return value
}

function parseNode(value, index) {
  if (!isRecord(value)) {
    throw new MapContractError(`Map node at index ${index} is invalid.`)
  }

  return {
    nodeId: readString(value.node_id, 'node_id'),
    name: readString(value.name, 'name'),
    floor: readInteger(value.floor, 'floor'),
    x: readInteger(value.x, 'x'),
    y: readInteger(value.y, 'y'),
  }
}

function parseEdge(value, index) {
  if (!isRecord(value)) {
    throw new MapContractError(`Map edge at index ${index} is invalid.`)
  }

  const direction = readString(value.direction, 'direction')

  if (direction !== '' && !COMPASS_DIRECTIONS.has(direction)) {
    throw new MapContractError(`Map edge direction "${direction}" is invalid.`)
  }

  return {
    fromNode: readString(value.from_node, 'from_node'),
    toNode: readString(value.to_node, 'to_node'),
    steps: readInteger(value.steps, 'steps'),
    direction,
  }
}

function parseFingerprint(value, nodeId, index) {
  if (!isRecord(value)) {
    throw new MapContractError(
      `Fingerprint at index ${index} for node "${nodeId}" is invalid.`,
    )
  }

  return {
    bssid: readString(value.bssid, 'bssid'),
    ssid: readString(value.ssid, 'ssid'),
    rssi: readInteger(value.rssi, 'rssi'),
  }
}

function parseFingerprints(value) {
  if (value === undefined) {
    return {}
  }

  if (!isRecord(value)) {
    throw new MapContractError('Map fingerprints must be an object.')
  }

  return Object.fromEntries(
    Object.entries(value).map(([nodeId, readings]) => {
      if (!Array.isArray(readings)) {
        throw new MapContractError(
          `Fingerprints for node "${nodeId}" must be an array.`,
        )
      }

      return [
        nodeId,
        readings.map((reading, index) =>
          parseFingerprint(reading, nodeId, index),
        ),
      ]
    }),
  )
}

export function parseMapResponse(payload) {
  if (!isRecord(payload)) {
    throw new MapContractError('The map response must be an object.')
  }

  if (!Array.isArray(payload.nodes) || !Array.isArray(payload.edges)) {
    throw new MapContractError('The map response must include nodes and edges.')
  }

  return {
    nodes: payload.nodes.map(parseNode),
    edges: payload.edges.map(parseEdge),
    fingerprints: parseFingerprints(payload.fingerprints),
  }
}
