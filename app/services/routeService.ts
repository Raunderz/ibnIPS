// ICPS/services/routeService.ts
// Route building service: validation, serialization and backend submit.
// Submitting a route follows the schema's room-tagging walk: each room in the
// walk is sent as one POST /api/ping, chaining previous_node_id to the node_id
// returned by the previous ping ("" for the first room).

import { Direction, RouteCollection, RouteEntry, isDirection, isPositiveInteger } from '../types';
import { PingRequest, PingResponse } from '../types/api';
import { pingBackend } from './apiClient';

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

// Build the schema PingRequest for a single room in the walk. previous_node_id
// is filled in at submit time from the previous ping's returned node_id.
export function serializePing(entry: RouteEntry, previousNodeId: string): PingRequest {
  const isFirst = entry.order === 1;
  return {
    name: entry.room_name,
    floor: entry.floor,
    previous_node_id: isFirst ? '' : previousNodeId,
    steps: isFirst ? -1 : (entry.steps_from_previous ?? 0),
    direction: isFirst ? '' : (entry.direction ?? ''),
    fingerprints: entry.networks.map((network) => ({
      bssid: network.id,
      ssid: network.name,
      rssi: network.rssi,
    })),
  };
}

// Per-entry validation from schema validation rules:
//   first room  -> previous_node_id "", steps -1, direction ""
//   linked room -> steps > 0, direction one of the 8 compass points
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

export interface SubmitRouteResult {
  ok: boolean;
  node_ids?: string[];
  responses?: PingResponse[];
  error?: string;
}

// Send the route to the backend one room at a time, chaining the previous
// room's returned node_id as previous_node_id for the next ping.
export async function submitRoute(
  collection: RouteCollection,
  email = 'user@iitb.ac.in'
): Promise<SubmitRouteResult> {
  const validationError = validateRoute(collection);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  try {
    const nodeIds: string[] = [];
    const responses: PingResponse[] = [];
    let previousNodeId = '';

    for (const entry of collection) {
      const payload = serializePing(entry, previousNodeId);
      const response = await pingBackend(payload, email);
      responses.push(response);
      nodeIds.push(response.node_id);
      previousNodeId = response.node_id;
    }

    return { ok: true, node_ids: nodeIds, responses };
  } catch {
    return { ok: false, error: 'backend unreachable' };
  }
}