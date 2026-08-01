// ICPS/services/apiClient.ts
// NOTE: Backend API internals are explicitly out of scope for the frontend team
// (spec section 1). This is a placeholder interface so screens/services can be
// wired against a stable contract, then swapped for the real implementation later.

import { NetworkReading, Position, Room } from '../types';
import { getRandomJitteredPosition } from './mockDataService';

const BASE_URL = 'https://placeholder-api.icps.local'; // to be replaced by backend team

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

export async function fetchCurrentPosition(): Promise<Position> {
  throw new Error('apiClient.fetchCurrentPosition not implemented — use mock mode');
}

export async function fetchRoomList(): Promise<Room[]> {
  throw new Error('apiClient.fetchRoomList not implemented — use mock mode');
}

export async function fetchVisibleNetworks(): Promise<NetworkReading[]> {
  throw new Error('apiClient.fetchVisibleNetworks not implemented — use mock mode');
}

export async function uploadLocationTag(roomId: string): Promise<{ success: boolean }> {
  throw new Error('apiClient.uploadLocationTag not implemented — use mock mode');
}

export { BASE_URL };