/**
 * Response contract for `POST /api/position`.
 *
 * Like `mapContract`, this is deliberately free of React Native imports so it
 * can be unit tested with the plain Node test runner.
 *
 * One quirk from the schema matters here: the server's `x`/`y` come from the
 * `nodes` table, which stays `0,0` until a room is placed on the map. Real
 * coordinates live in `map.json`, which the client already holds. So a `0,0`
 * pair is reported as "unplaced" rather than silently treated as a position at
 * the origin of the building.
 */

export class PositionContractError extends Error {
  constructor(message) {
    super(message)
    this.name = 'PositionContractError'
  }
}

const CONFIDENCE_LEVELS = new Set(['high', 'medium', 'low', 'uncertain'])

/**
 * Strict numeric coercion.
 *
 * `Number(null)` and `Number('')` are both `0`, so a missing coordinate would
 * otherwise be accepted as a real position at the origin. Only numbers and
 * non-blank numeric strings count.
 */
function toFiniteNumber(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

/** Server labels are capitalised; the app's badge tones use lower case. */
function normalizeConfidenceLevel(value) {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim().toLowerCase()

  return CONFIDENCE_LEVELS.has(normalized) ? normalized : null
}

/**
 * `Uncertain` has no separate badge tone in the app, so it borrows `low`. The
 * original label stays available as `confidenceLabel` for callers that care.
 */
function toToneLabel(level) {
  return level === 'uncertain' ? 'low' : level
}

export function parsePositionResponse(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new PositionContractError('The position response is not an object.')
  }

  if (typeof payload.node_id !== 'string' || !payload.node_id.trim()) {
    throw new PositionContractError('The position response has no node_id.')
}

  const x = toFiniteNumber(payload.x)
  const y = toFiniteNumber(payload.y)

  if (x === null || y === null) {
    throw new PositionContractError('The position response has invalid coordinates.')
  }

  const floor = toFiniteNumber(payload.floor)

  if (floor === null) {
    throw new PositionContractError('The position response has an invalid floor.')
  }

  const confidence = toFiniteNumber(payload.confidence)
  const samples = toFiniteNumber(payload.samples)
  const serverLevel = normalizeConfidenceLevel(payload.confidence_level)
  // Prefer the server's own label, and fall back to the app's thresholds so an
  // older or newer backend still renders a sensible badge.
  const level = serverLevel ?? (confidence === null ? null : deriveLevel(confidence))

  return {
    nodeId: payload.node_id.trim(),
    name: typeof payload.name === 'string' ? payload.name : '',
    floor,
    x,
    y,
    confidence,
    confidenceLabel: level,
    confidenceTone: toToneLabel(level),
    samples,
    // A 0,0 pair means the room has never been placed, not that the user is at
    // the origin. Callers must fall back to their own copy of the map.
    hasServerCoordinates: !(x === 0 && y === 0),
  }
}

function deriveLevel(confidence) {
  if (confidence >= 75) {
    return 'high'
  }

  if (confidence >= 50) {
    return 'medium'
  }

  if (confidence >= 30) {
    return 'low'
  }

  return 'uncertain'
}