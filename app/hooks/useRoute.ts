// ICPS/hooks/useRoute.ts
// Shared in-memory route state. Because screens unmount/remount during
// navigation, the store lives at module scope and is subscribed via
// useSyncExternalStore so the route collection persists across screens.

import { useCallback, useSyncExternalStore } from 'react';
import { Direction, RouteCollection, RouteEntry, FloorNumber, NetworkReading } from '../types';
import { validateRouteEntry } from '../services/routeService';

let routeCollection: RouteCollection = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function snapshot(): RouteCollection {
  return routeCollection;
}

function setRoute(next: RouteCollection) {
  routeCollection = next;
  emit();
}

function now() {
  return Date.now();
}

export function addToRoute(
  room_id: string,
  room_name: string,
  floor: FloorNumber,
  position: { x: number; y: number; confidence: number },
  networks: NetworkReading[]
): RouteEntry {
  const entry: RouteEntry = {
    room_id,
    room_name,
    floor,
    order: routeCollection.length + 1,
    steps_from_previous: null,
    direction: null,
    timestamp: now(),
    editable: true,
    x: position.x,
    y: position.y,
    confidence: position.confidence,
    networks,
  };
  setRoute([...routeCollection, entry]);
  return entry;
}

export interface RouteUpdate {
  steps?: number;
  direction?: Direction | null;
  room_id?: string;
  room_name?: string;
  floor?: FloorNumber;
  x?: number;
  y?: number;
  confidence?: number;
  networks?: NetworkReading[];
}

export function updateRoute(index: number, changes: RouteUpdate): string | null {
  if (index < 0 || index >= routeCollection.length) {
    return 'Route entry not found';
  }
  const next = routeCollection.map((entry, i) => {
    if (i !== index) return entry;
    const updated: RouteEntry = {
      ...entry,
      room_id: changes.room_id !== undefined ? changes.room_id : entry.room_id,
      room_name: changes.room_name !== undefined ? changes.room_name : entry.room_name,
      floor: changes.floor !== undefined ? changes.floor : entry.floor,
      steps_from_previous:
        changes.steps !== undefined ? changes.steps : entry.steps_from_previous,
      direction: changes.direction !== undefined ? changes.direction : entry.direction,
      x: changes.x !== undefined ? changes.x : entry.x,
      y: changes.y !== undefined ? changes.y : entry.y,
      confidence: changes.confidence !== undefined ? changes.confidence : entry.confidence,
      networks: changes.networks !== undefined ? changes.networks : entry.networks,
    };
    const error = validateRouteEntry(updated);
    if (error) throw new Error(error);
    return updated;
  });
  setRoute(next);
  return null;
}

export function deleteFromRoute(index: number): RouteCollection {
  if (index < 0 || index >= routeCollection.length) {
    return routeCollection;
  }
  const withoutEntry = routeCollection.filter((_, i) => i !== index);
  const reordered = withoutEntry.map((entry, i) => ({
    ...entry,
    order: i + 1,
    // The next entry becomes a fresh hop after its predecessor is removed.
    steps_from_previous: i === index ? null : entry.steps_from_previous,
    direction: i === index ? null : entry.direction,
  }));
  setRoute(reordered);
  return reordered;
}

export function getRoute(): RouteCollection {
  return routeCollection;
}

export function clearRoute() {
  setRoute([]);
}

export function useRoute() {
  const route = useSyncExternalStore(subscribe, snapshot);

  const add = useCallback((
    room_id: string,
    room_name: string,
    floor: FloorNumber,
    position: { x: number; y: number; confidence: number },
    networks: NetworkReading[]
  ) => {
    addToRoute(room_id, room_name, floor, position, networks);
  }, []);

  const update = useCallback((index: number, changes: RouteUpdate) => {
    return updateRoute(index, changes);
  }, []);

  const remove = useCallback((index: number) => {
    deleteFromRoute(index);
  }, []);

  const clear = useCallback(() => {
    clearRoute();
  }, []);

  return { routeCollection: route, addToRoute: add, updateRoute: update, deleteFromRoute: remove, clearRoute: clear };
}
