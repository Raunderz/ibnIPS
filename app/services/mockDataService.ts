// ICPS/services/mockDataService.ts

import { MockScenario, Position, NetworkReading } from '../types';

function now() {
  return Date.now();
}

const mockScenarios: Record<MockScenario['id'], MockScenario> = {
  lab_201: {
    id: 'lab_201',
    label: 'Inject: Lab 201',
    position: { x: 256, y: 256, floor: 2, confidence: 90, timestamp: now() },
    networks: [
      { id: 'n1', name: 'Network 1', rssi: -65 },
      { id: 'n2', name: 'Network 2', rssi: -72 },
      { id: 'n3', name: 'Network 3', rssi: -78 },
      { id: 'n4', name: 'Network 4', rssi: -82 },
      { id: 'n5', name: 'Network 5', rssi: -88 },
    ],
  },
  hall_1f: {
    id: 'hall_1f',
    label: 'Inject: Hall 1F',
    position: { x: 120, y: 340, floor: 1, confidence: 60, timestamp: now() },
    networks: [
      { id: 'n1', name: 'Network 1', rssi: -80 },
      { id: 'n2', name: 'Network 2', rssi: -85 },
    ],
  },
  physics: {
    id: 'physics',
    label: 'Inject: Physics',
    position: { x: 300, y: 180, floor: 3, confidence: 75, timestamp: now() },
    networks: [
      { id: 'n1', name: 'Network 1', rssi: -70 },
      { id: 'n2', name: 'Network 2', rssi: -76 },
      { id: 'n3', name: 'Network 3', rssi: -83 },
    ],
  },
  edge_case: {
    id: 'edge_case',
    label: 'Inject: Edge Case',
    position: { x: 0, y: 0, floor: 1, confidence: 20, timestamp: now() },
    networks: [
      { id: 'n1', name: 'Network 1', rssi: -95 },
      { id: 'n2', name: 'Network 2', rssi: -98 },
    ],
  },
};

export function getMockScenario(id: MockScenario['id']): MockScenario {
  return { ...mockScenarios[id], position: { ...mockScenarios[id].position, timestamp: now() } };
}

export function getAllMockScenarios(): MockScenario[] {
  return Object.values(mockScenarios);
}

// Simulates a live position feed for testing the pin animation loop (spec 3.1)
export function getRandomJitteredPosition(base: Position): Position {
  return {
    ...base,
    x: base.x + (Math.random() * 10 - 5),
    y: base.y + (Math.random() * 10 - 5),
    timestamp: now(),
  };
}