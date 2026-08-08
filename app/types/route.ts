// ICPS/types/route.ts
// Route building types (see new.pdf — Step Tracking & Route Building).

import type { FloorNumber, NetworkReading } from './index';

export type Direction = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export const DIRECTIONS: Direction[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export const DIRECTION_LABELS: Record<Direction, string> = {
  N: 'North',
  NE: 'Northeast',
  E: 'East',
  SE: 'Southeast',
  S: 'South',
  SW: 'Southwest',
  W: 'West',
  NW: 'Northwest',
};

export const DIRECTION_ARROWS: Record<Direction, string> = {
  N: '↑',
  NE: '↗',
  E: '→',
  SE: '↘',
  S: '↓',
  SW: '↙',
  W: '←',
  NW: '↖',
};

export interface RouteEntry {
  room_id: string;
  room_name: string;
  floor: FloorNumber;
  order: number;
  steps_from_previous: number | null;
  direction: Direction | null;
  timestamp: number;
  editable: boolean;
  // Actual captured position + Wi-Fi data at tag time
  x: number;
  y: number;
  confidence: number;
  networks: NetworkReading[];
}

export type RouteCollection = RouteEntry[];

export function isDirection(value: unknown): value is Direction {
  return typeof value === 'string' && (DIRECTIONS as string[]).includes(value);
}

export function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}
