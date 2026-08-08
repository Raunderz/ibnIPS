// ICPS/services/positionService.ts
// Resolves the next user position. In mock mode it jitters around a base
// position (spec 3.1); in real mode it derives position from live Wi-Fi scan
// results (confidence comes from actual RSSI).

import { Position, FloorNumber } from '../types';
import { getRandomJitteredPosition } from './mockDataService';
import { fetchCurrentPosition } from './apiClient';
import { getSignalQuality } from '../utils/wifi';

export async function getNextPosition(isMockMode: boolean, mockBasePosition?: Position): Promise<Position> {
  if (isMockMode) {
    if (!mockBasePosition) {
      throw new Error('Mock mode requires a base position');
    }
    // Spec 3.1: jitter the pin around the base to simulate a live feed
    return getRandomJitteredPosition(mockBasePosition);
  }
  return fetchCurrentPosition();
}

// Builds a real Position from live Wi-Fi scan results. Confidence is derived
// from the strongest detected AP's RSSI. Floor is taken from the floor the user
// is viewing. x/y is an RSSI-weighted centroid over stable per-BSSID anchors:
// each AP maps deterministically to a fixed point on the map, so the pin moves
// smoothly as the set of visible APs and their strengths change while walking.
const MAP_PADDING = 64; // keep anchors away from the 512x512 map edges
const MAP_SPAN = 512 - MAP_PADDING * 2;

function hashStringToUnit(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

function rssiWeight(rssi: number): number {
  // -50 dBm and better → 1.0; -100 dBm and worse → 0.0.
  return Math.max(0, Math.min(1, (rssi + 100) / 50));
}

export function getPositionFromScans(
  scans: Array<{ rssi: number; bssid?: string }>,
  floor: FloorNumber
): Position | null {
  if (!scans || scans.length === 0) {
    return null;
  }
  const strongest = scans.reduce((a, b) => (b.rssi > a.rssi ? b : a));
  let totalWeight = 0;
  let accX = 0;
  let accY = 0;
  for (let i = 0; i < scans.length; i++) {
    const weight = rssiWeight(scans[i].rssi);
    if (weight === 0) continue;
    const seed =
      scans[i].bssid && scans[i].bssid!.length > 0 ? scans[i].bssid! : `#ap-${i}`;
    const h1 = hashStringToUnit(seed);
    const h2 = hashStringToUnit(`${seed}:${seed.length}`);
    accX += (MAP_PADDING + h1 * MAP_SPAN) * weight;
    accY += (MAP_PADDING + h2 * MAP_SPAN) * weight;
    totalWeight += weight;
  }
  const x = totalWeight === 0 ? 256 : Math.round(accX / totalWeight);
  const y = totalWeight === 0 ? 256 : Math.round(accY / totalWeight);
  return {
    floor,
    x,
    y,
    confidence: getSignalQuality(strongest.rssi),
    timestamp: Date.now(),
  };
}

export { fetchCurrentPosition, fetchRoomList, fetchVisibleNetworks, uploadLocationTag, BASE_URL } from './apiClient';
