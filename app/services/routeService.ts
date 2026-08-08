// ICPS/services/routeService.ts
// Route building service: serialization, validation and backend submit (POST /api/ping).

import { Direction, RouteCollection, RouteEntry, isDirection, isPositiveInteger } from '../types';
import { pingBackend, PingResponse } from './apiClient';

export interface SerializedRouteEntry {
  room_id: string;
  steps_from_previous: number | null;
  direction: Direction | null;
}

export interface SerializedRoute {
  route: SerializedRouteEntry[];
}

export function serializeRoute(collection: RouteCollection): SerializedRoute {
  return {
    route: collection.map((entry) => ({
      room_id: entry.room_id,
      steps_from_previous: entry.steps_from_previous,
      direction: entry.direction,
    })),
  };
}

// Per-entry validation from spec: room_id non-empty, steps positive integer or
// null (first entry), direction one of the 8 compass points or null.
export function validateRouteEntry(entry: RouteEntry): string | null {
  if (typeof entry.room_id !== 'string' || entry.room_id.trim().length === 0) {
    return 'room_id must be a non-empty string';
  }
  if (entry.order === 1) {
    if (entry.steps_from_previous !== null) {
      return 'First location cannot have steps';
    }
    if (entry.direction !== null) {
      return 'First location cannot have direction';
    }
    return null;
  }
  if (!isPositiveInteger(entry.steps_from_previous)) {
    return 'Steps must be a positive integer';
  }
  if (!isDirection(entry.direction)) {
    return 'Direction must be one of N, NE, E, SE, S, SW, W, NW';
  }
  return null;
}

// Route-as-a-whole validation: min 2 locations, same floor, all entries valid.
export function validateRoute(collection: RouteCollection): string | null {
  if (collection.length < 2) {
    return 'Route requires at least 2 locations';
  }
  const firstFloor = collection[0].floor;
  for (const entry of collection) {
    if (entry.floor !== firstFloor) {
      return 'All locations must be on same floor';
    }
    const entryError = validateRouteEntry(entry);
    if (entryError) return entryError;
  }
  return null;
}

export async function submitRoute(
  collection: RouteCollection
): Promise<{ ok: boolean; response?: PingResponse; error?: string }> {
  const validationError = validateRoute(collection);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  try {
    const payload = serializeRoute(collection);
    const response = await pingBackend(payload);
    return { ok: true, response };
  } catch {
    return { ok: false, error: 'backend unreachable' };
  }
}
