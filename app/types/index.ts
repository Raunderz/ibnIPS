export type FloorNumber = 1 | 2 | 3;

export interface Position {
  x: number; 
  y: number;
  floor: FloorNumber;
  confidence: number; 
  timestamp: number;
}

export interface Room {
  id: string;
  name: string;
  floor: FloorNumber;
}

export interface NetworkReading {
  id: string;
  name: string;
  rssi: number; 
}

export type MockScenarioId = 'lab_201' | 'hall_1f' | 'physics' | 'edge_case';

export interface MockScenario {
  id: MockScenarioId;
  label: string; 
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