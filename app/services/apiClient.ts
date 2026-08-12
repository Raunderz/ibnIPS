// ICPS/services/apiClient.ts
// Backend client matching backend/schema.md:
//   POST /api/auth      → { token }
//   POST /api/ping      → { status, node_id }   (auth required)
//   GET  /api/nodes     → Node[]
//   GET  /api/map       → { nodes, edges }
// All endpoints under /api; JSON responses; bearer auth for /api/ping.

import { NetworkReading, Position, Room } from '../types';
import {
  ApiEdge,
  ApiNode,
  AuthResponse,
  MapData,
  PingRequest,
  PingResponse,
} from '../types/api';
import { API_PORT, AUTH_TIMEOUT_MS, ROOM_LIST_TIMEOUT_MS } from '../utils/constants';
import { getAuthToken, setAuthToken } from './storageService';

const FALLBACK_BASE_URL = 'https://ibnips.onrender.com';
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

function parseError(data: unknown): string {
  if (typeof data === 'object' && data !== null) {
    const record = data as Record<string, unknown>;
    if (typeof record.details === 'string') return record.details;
    if (typeof record.error === 'string') return record.error;
  }
  return 'Request failed';
}

async function http<T>(
  path: string,
  options: { method?: string; token?: string | null; body?: unknown; timeoutMs?: number } = {}
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? ROOM_LIST_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (options.token) headers.Authorization = `Bearer ${options.token}`;

    const response = await fetch(`${getBaseUrl()}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    if (!response.ok) {
      let details = `HTTP ${response.status}`;
      try {
        details = parseError(await response.json());
      } catch {
        // Keep the status-based message when the body is not JSON.
      }
      throw new Error(details);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

// ------------------------------------------------------------------
// Auth — POST /api/auth
// ------------------------------------------------------------------

// The backend only issues tokens for @iitb.ac.in addresses (schema.md Auth).
export async function authenticate(email: string): Promise<string> {
  const response = await http<AuthResponse>('/api/auth', {
    method: 'POST',
    body: { email },
    timeoutMs: AUTH_TIMEOUT_MS,
  });
  await setAuthToken(response.token);
  return response.token;
}

export async function ensureAuthToken(email: string): Promise<string> {
  const stored = await getAuthToken();
  if (stored) return stored;
  return authenticate(email);
}

export async function fetchCurrentPosition(): Promise<Position> {
  throw new Error('apiClient.fetchCurrentPosition not implemented — use mock mode');
}

// ------------------------------------------------------------------
// Get Nodes — GET /api/nodes (no auth)
// ------------------------------------------------------------------

function parseRoom(raw: unknown): Room | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const record = raw as Record<string, unknown>;
  // Schema node: { node_id, name, floor, x, y }. Accept id as an alias.
  const id = typeof record.node_id === 'string' ? record.node_id : record.id;
  if (typeof id !== 'string' || typeof record.name !== 'string') return null;
  const floor = Number(record.floor);
  if (!Number.isInteger(floor) || floor < 0) return null;
  return {
    id,
    name: record.name,
    floor: floor as Room['floor'],
    x: typeof record.x === 'number' ? record.x : undefined,
    y: typeof record.y === 'number' ? record.y : undefined,
  };
}

export async function fetchRoomList(): Promise<Room[]> {
  const data = await http<unknown>('/api/nodes');
  const rawRooms = Array.isArray(data) ? data : (data as { rooms?: unknown } | null)?.rooms;
  if (!Array.isArray(rawRooms)) {
    throw new Error('Malformed nodes response');
  }
  const rooms = rawRooms.map(parseRoom).filter((room): room is Room => room !== null);
  if (rooms.length === 0) {
    throw new Error('No nodes returned');
  }
  return rooms;
}

// ------------------------------------------------------------------
// Get Map — GET /api/map (no auth)
// ------------------------------------------------------------------

export async function fetchMap(): Promise<MapData> {
  const data = await http<unknown>('/api/map');
  if (typeof data !== 'object' || data === null) {
    throw new Error('Malformed map response');
  }
  const record = data as Record<string, unknown>;
  const nodes = Array.isArray(record.nodes) ? (record.nodes as ApiNode[]) : [];
  const edges = Array.isArray(record.edges) ? (record.edges as ApiEdge[]) : [];
  return { nodes, edges };
}

export async function fetchVisibleNetworks(): Promise<NetworkReading[]> {
  throw new Error('apiClient.fetchVisibleNetworks not implemented — use mock mode');
}

export async function uploadLocationTag(roomId: string): Promise<{ success: boolean }> {
  throw new Error('apiClient.uploadLocationTag not implemented — use mock mode');
}

// ------------------------------------------------------------------
// Ping — POST /api/ping (auth required)
// ------------------------------------------------------------------

// Tag a room: creates (or reuses) a node and its fingerprints, optionally
// linking it to the previous node via an edge.
export async function pingBackend(
  payload: PingRequest,
  email = 'user@iitb.ac.in'
): Promise<PingResponse> {
  const token = await ensureAuthToken(email);
  return http<PingResponse>('/api/ping', {
    method: 'POST',
    token,
    body: payload,
    timeoutMs: ROUTE_SUBMIT_TIMEOUT_MS,
  });
}