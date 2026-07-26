// ICPS/types/index.ts

export type FloorNumber = 0 | 1 | 2 | 3; // 0 = Ground

export interface Position {
  x: number; // pixel position on floor plan image
  y: number;
  floor: FloorNumber;
  confidence: number; // 0-100
  timestamp: number;
}

export interface Room {
  id: string;
  name: string; // e.g. "Lab 201"
  floor: FloorNumber;
}

export interface NetworkReading {
  id: string;
  name: string;
  rssi: number; // signal strength in dBm, e.g. -65
}

export type MockScenarioId = 'ground' | 'lab_201' | 'hall_1f' | 'physics' | 'edge_case';

export interface MockScenario {
  id: MockScenarioId;
  label: string; // e.g. "Inject: Lab 201"
  position: Position;
  networks: NetworkReading[];
}

export type PositionStatus = 'loading' | 'active' | 'error';

export type ToastVariant = 'success' | 'warning' | 'error';

export interface ToastMessage {
  id: string;
  message: string;
  variant: ToastVariant;
}

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

export type TagUploadStatus = 'idle' | 'ready' | 'loading' | 'success' | 'error';