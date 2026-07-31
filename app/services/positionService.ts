// ICPS/services/apiClient.ts
// NOTE: Backend API internals are explicitly out of scope for the frontend team
// (spec section 1). This is a placeholder interface so screens/services can be
// wired against a stable contract, then swapped for the real implementation later.

import { NetworkReading, Position, Room } from '../types';

const BASE_URL = 'https://placeholder-api.icps.local'; // to be replaced by backend team

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