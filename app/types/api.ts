// app/types/api.ts
// Types mirroring the backend contract (backend/schema.md).

export interface Fingerprint {
  bssid: string;
  ssid: string;
  rssi: number;
}

export interface PingRequest {
  name: string;
  floor: number;
  previous_node_id: string;
  steps: number;
  direction: string;
  fingerprints: Fingerprint[];
}

export interface PingResponse {
  status: string;
  node_id: string;
}

export interface AuthResponse {
  token: string;
}

export interface AuthRequest {
  email: string;
}

export interface ApiNode {
  node_id: string;
  name: string;
  floor: number;
  x: number;
  y: number;
}

export interface ApiEdge {
  from_node: string;
  to_node: string;
  steps: number;
  direction: string;
}

export interface MapData {
  nodes: ApiNode[];
  edges: ApiEdge[];
}

export interface ApiError {
  error: string;
  details: string;
}