// app/utils/constants.ts

import type { Room } from '../types';

// AsyncStorage Keys
export const HAS_SEEN_ONBOARDING_KEY = 'hasSeenOnboarding';
export const THEME_ACCENT_KEY = 'themeAccent';
export const MOCK_MODE_KEY = 'mockModePrefs';

// Backend API (schema.md)
export const API_PORT = 3000;
export const ROOM_LIST_TIMEOUT_MS = 5000;
export const AUTH_TIMEOUT_MS = 5000;
export const AUTH_TOKEN_KEY = 'authToken';
export const DEFAULT_AUTH_EMAIL = 'user@iitb.ac.in';

export const FLOORS = [0, 1, 2, 3] as const;

export const FLOOR_LABELS: Record<number, string> = {
  0: 'Ground Floor',
  1: '1st Floor',
  2: '2nd Floor',
  3: '3rd Floor',
};

export const FLOOR_SHORT_LABELS: Record<number, string> = {
  0: 'G',
  1: '1',
  2: '2',
  3: '3',
};

export const ROOMS: Room[] = [
  { id: 'reception', name: 'Reception', floor: 0, x: 200, y: 400 },
  { id: 'cafeteria', name: 'Cafeteria', floor: 0, x: 350, y: 300 },
  { id: 'cs101', name: 'CS101', floor: 1, x: 180, y: 280 },
  { id: 'hall_1f', name: 'Hall (1F)', floor: 1, x: 120, y: 340 },
  { id: 'lab_201', name: 'Lab 201', floor: 2, x: 256, y: 256 },
  { id: 'physics_312', name: 'Physics Lab (312)', floor: 3, x: 300, y: 180 },
];

// Position Polling
export const POSITION_UPDATE_INTERVAL_MS = 5000;
export const POSITION_REQUEST_TIMEOUT_MS = 5000;

// Toast Messages
export const TOAST_DURATION_MS = 3000;

// App info
export const APP_VERSION = '1.0.0';
export const BUILD_DATE = '2026-08-06';

// Tag Upload
export const TAG_UPLOAD_TIMEOUT_MS = 5000;

// Route Building (new.pdf — Step Tracking & Route Building)
export const MAX_ROUTE_STEPS = 9999;

// Wi-Fi Scanning
export const WIFI_SCAN_INTERVAL_MS = 3000;
export const MIN_RSSI_THRESHOLD = -100;
export const MAX_NETWORKS_DISPLAY = 50;

// Signal Quality Thresholds
export const SIGNAL_QUALITY_EXCELLENT = 70;
export const SIGNAL_QUALITY_GOOD = 40;
export const SIGNAL_QUALITY_FAIR = 20;
export const SIGNAL_QUALITY_POOR = 0;