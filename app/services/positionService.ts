// ICPS/services/positionService.ts

import { Position } from '../types';
import { getMockScenario, getRandomJitteredPosition } from './mockDataService';
import { fetchCurrentPosition } from './apiClient';
import { POSITION_TIMEOUT_MS } from '../utils/constants';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

// Fetches the next position. In mock mode, jitters around a base scenario
// to simulate a live feed without hitting the real backend.
export async function getNextPosition(
  isMockMode: boolean,
  mockBase?: Position
): Promise<Position> {
  if (isMockMode) {
    const base = mockBase ?? getMockScenario('lab_201').position;
    return getRandomJitteredPosition(base);
  }
  return withTimeout(fetchCurrentPosition(), POSITION_TIMEOUT_MS);
}

// Simple nearest-room lookup placeholder — real logic lives in backend/positioning.
// Frontend just needs a name + confidence to render (spec section 4.1).
export function describePosition(position: Position, roomName: string): string {
  return `Nearest Room: ${roomName}`;
}