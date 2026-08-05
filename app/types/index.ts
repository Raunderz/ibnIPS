// app/types/index.ts

export type FloorNumber = 0 | 1 | 2 | 3;

export interface Position {
  floor: FloorNumber;
  x: number;
  y: number;
  confidence: number;
  timestamp: number;
}

export interface Room {
  id: string;
  name: string;
  floor: FloorNumber;
  bounds: { x1: number; y1: number; x2: number; y2: number };
}

export interface NetworkReading {
  bssid: string;
  ssid: string | null;
  rssi: number;
  frequency: number;
  timestamp: number;
}

export type MockScenarioId = 'ground' | 'lab_201' | 'hall_1f' | 'physics' | 'edge_case';

export interface MockScenario {
  id: MockScenarioId;
  floor: FloorNumber;
  position: { x: number; y: number };
  confidence: number;
  label: string;
}

export type PositionStatus = 'locating' | 'located' | 'error' | 'idle';

export interface ToastMessage {
  id: string;
  message: string;
  variant: ToastVariant;
}

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

export type TagUploadStatus = 'idle' | 'uploading' | 'success' | 'error';

// Wi-Fi Scanning Types
export interface WifiNetwork {
  bssid: string;
  ssid: string | null;
  rssi: number;
  frequency: number;
}

export interface WifiScanState {
  networks: WifiNetwork[];
  isScanning: boolean;
  lastUpdate: Date | null;
  scanCount: number;
  error: string | null;
}