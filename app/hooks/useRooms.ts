// ICPS/hooks/useRooms.ts
// Shared room list. The store starts from the static ROOMS defaults so the app
// works offline, then replaces them with the backend's room list when
// fetchRoomList succeeds. All screens subscribe via useSyncExternalStore so a
// refresh updates everywhere at once.

import { useEffect, useSyncExternalStore } from 'react';
import { Room, FloorNumber } from '../types';
import { fetchRoomList } from '../services/apiClient';
import { ROOMS } from '../utils/constants';

let rooms: Room[] = ROOMS;
let isDynamic = false;
let loadStarted = false;
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

function snapshot(): Room[] {
  return rooms;
}

export async function refreshRooms(): Promise<Room[]> {
  try {
    const fetched = await fetchRoomList();
    if (fetched.length > 0) {
      rooms = fetched;
      isDynamic = true;
      emit();
    }
  } catch {
    // Keep the current list (defaults or the last known one).
  }
  return rooms;
}

// Kick off a single background load; safe to call from any screen or layout.
export function ensureRoomsLoaded() {
  if (!loadStarted) {
    loadStarted = true;
    void refreshRooms();
  }
}

export function getRooms(): Room[] {
  return rooms;
}

export function getRoomsDynamic(): boolean {
  return isDynamic;
}

export function getFloors(): FloorNumber[] {
  const floors = Array.from(new Set(rooms.map((room) => room.floor)));
  return floors.sort((a, b) => a - b) as FloorNumber[];
}

export function useRooms(): Room[] {
  const current = useSyncExternalStore(subscribe, snapshot);

  useEffect(() => {
    ensureRoomsLoaded();
  }, []);

  return current;
}
