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
  x?: number;
  y?: number;
}

export interface NetworkReading {
  id: string;
  name: string;
  rssi: number;
  timestamp?: number;
}

export type MockScenarioId = 'ground' | 'lab_201' | 'hall_1f' | 'physics' | 'edge_case';

export interface MockScenario {
  id: MockScenarioId;
  label: string;
  position: Position;
  networks: NetworkReading[];
}

export type PositionStatus = 'loading' | 'active' | 'error';

export interface ToastMessage {
  id: string;
  message: string;
  variant: ToastVariant;
}

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

export type TagUploadStatus = 'idle' | 'loading' | 'success' | 'error';

export * from './route';
export * from './api';