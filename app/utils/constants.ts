// app/utils/constants.ts

// AsyncStorage Keys
export const HAS_SEEN_ONBOARDING_KEY = 'hasSeenOnboarding';

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

export const ROOMS = [
  { id: 'reception', name: 'Reception', floor: 0 },
  { id: 'cafeteria', name: 'Cafeteria', floor: 0 },
  { id: 'cs101', name: 'CS101', floor: 1 },
  { id: 'hall_1f', name: 'Hall (1F)', floor: 1 },
  { id: 'lab_201', name: 'Lab 201', floor: 2 },
  { id: 'physics_312', name: 'Physics Lab (312)', floor: 3 },
];

// Position Polling
export const POSITION_UPDATE_INTERVAL_MS = 5000;
export const POSITION_REQUEST_TIMEOUT_MS = 5000;

// Toast Messages
export const TOAST_DURATION_MS = 3000;

// Wi-Fi Scanning
export const WIFI_SCAN_INTERVAL_MS = 3000;
export const MIN_RSSI_THRESHOLD = -100;
export const MAX_NETWORKS_DISPLAY = 50;

// Signal Quality Thresholds
export const SIGNAL_QUALITY_EXCELLENT = 70;
export const SIGNAL_QUALITY_GOOD = 40;
export const SIGNAL_QUALITY_FAIR = 20;
export const SIGNAL_QUALITY_POOR = 0;