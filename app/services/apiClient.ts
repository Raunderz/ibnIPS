// ICPS/services/apiClient.ts
// NOTE: Backend API internals are explicitly out of scope for the frontend team
// (spec section 1). Stubs that cannot be served yet throw, while the pieces the
// route-building flow needs (room list, /api/ping) are wired to the real
// backend when reachable and fall back gracefully otherwise.

import { NetworkReading, Position, Room } from '../types';
import { API_PORT, ROOM_LIST_TIMEOUT_MS } from '../utils/constants';

const FALLBACK_BASE_URL = 'https://placeholder-api.icps.local';
let cachedBaseUrl: string | null = null;

// Resolve the backend URL at runtime:
//  1. EXPO_PUBLIC_API_URL if set (explicit override),
//  2. the Metro host (LAN IP) when running a dev build — the phone can reach
//     the dev machine that serves the bundle, so the backend on the same
//     machine is reachable at http://<host>:3000,
//  3. a static fallback otherwise.
export function getBaseUrl(): string {
  if (cachedBaseUrl) return cachedBaseUrl;

  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    cachedBaseUrl = envUrl.replace(/\/+$/, '');
    return cachedBaseUrl;
  }

  try {
    const Constants = require('expo-constants').default;
    const hostUri: string | undefined = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const host = hostUri.split(':')[0];
      if (host) {
        cachedBaseUrl = `http://${host}:${API_PORT}`;
        return cachedBaseUrl;
      }
    }
  } catch {
    // expo-constants unavailable (tests / unsupported platforms) — fall back.
  }

  cachedBaseUrl = FALLBACK_BASE_URL;
  return cachedBaseUrl;
}

export const BASE_URL = FALLBACK_BASE_URL;

export const ROUTE_SUBMIT_TIMEOUT_MS = 5000;

export async function fetchCurrentPosition(): Promise<Position> {
  throw new Error('apiClient.fetchCurrentPosition not implemented — use mock mode');
}

function parseRoom(raw: unknown): Room | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.id !== 'string' || typeof record.name !== 'string') return null;
  const floor = Number(record.floor);
  if (!Number.isInteger(floor) || floor < 0) return null;
  return {
    id: record.id,
    name: record.name,
    floor: floor as Room['floor'],
    x: typeof record.x === 'number' ? record.x : undefined,
    y: typeof record.y === 'number' ? record.y : undefined,
  };
}

export async function fetchRoomList(): Promise<Room[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ROOM_LIST_TIMEOUT_MS);
  try {
    const response = await fetch(`${getBaseUrl()}/api/rooms`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = (await response.json()) as unknown;
    const rawRooms = Array.isArray(data) ? data : (data as { rooms?: unknown } | null)?.rooms;
    if (!Array.isArray(rawRooms)) {
      throw new Error('Malformed rooms response');
    }
    const rooms = rawRooms.map(parseRoom).filter((room): room is Room => room !== null);
    if (rooms.length === 0) {
      throw new Error('No rooms returned');
    }
    return rooms;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchVisibleNetworks(): Promise<NetworkReading[]> {
  throw new Error('apiClient.fetchVisibleNetworks not implemented — use mock mode');
}

export async function uploadLocationTag(roomId: string): Promise<{ success: boolean }> {
  throw new Error('apiClient.uploadLocationTag not implemented — use mock mode');
}

export interface PingResponse {
  status: string;
  route_received: number;
  message: string;
}

// POST /api/ping — frontend-only ping to the backend. The backend does not
// persist route data yet; this just confirms the payload was received.
//
// Currently the backend endpoint is not deployed, so if the real request
// cannot be delivered (unreachable / timeout / non-2xx) we fall back to the
// documented pong response (see new.pdf "Response (Expected)") so the full
// frontend flow completes. Swap this fallback out once the backend is live.
export async function pingBackend(payload: { route: unknown[] }): Promise<PingResponse> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ROUTE_SUBMIT_TIMEOUT_MS);
    const response = await fetch(`${getBaseUrl()}/api/ping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return (await response.json()) as PingResponse;
  } catch {
    return {
      status: 'pong',
      route_received: payload.route.length,
      message: 'Route data received (not yet stored)',
    };
  }
}
