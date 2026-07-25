// ICPS/utils/constants.ts

import { Room } from '../types';

export const ROOMS: Room[] = [
  { id: 'cs101', name: 'CS 101', floor: 1 },
  { id: 'hall1f', name: 'Hall 1F', floor: 1 },
  { id: 'lab201', name: 'Lab 201', floor: 2 },
  { id: 'physics312', name: 'Physics 312', floor: 3 },
];

export const POSITION_UPDATE_INTERVAL_MS = 4000; 
export const POSITION_TIMEOUT_MS = 5000;
export const TAG_UPLOAD_TIMEOUT_MS = 10000;
export const ROOM_LIST_FETCH_TIMEOUT_MS = 5000;

export const TOAST_DURATION_MS = 2500; // 2-3 seconds, spec 7.2
export const MAX_TOAST_QUEUE = 1;

export const FLOORS: (1 | 2 | 3)[] = [1, 2, 3];

export const APP_VERSION = '1.0.0';
export const BUILD_DATE = '2024-11-15';

export const HAS_SEEN_ONBOARDING_KEY = 'hasSeenOnboarding';