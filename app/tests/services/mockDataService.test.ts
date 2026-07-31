import type { MockScenario, NetworkReading, Position } from '../types/index';

// Test the mock data service logic — validates that mock scenarios
// are well-formed and provides helper functions for generating test data.

const MOCK_SCENARIOS: MockScenario[] = [
  {
    id: 'lab_201',
    label: 'Lab 201 — Indoor',
    position: { x: 120, y: 80, floor: 2, confidence: 0.92, timestamp: 1700000000000 },
    networks: [
      { id: 'w1', name: 'LabNet-2F', rssi: -35 },
      { id: 'w2', name: 'CampusWiFi', rssi: -55 },
      { id: 'w3', name: 'EduRoam', rssi: -70 },
    ],
  },
  {
    id: 'hall_1f',
    label: 'Hallway 1F — Corridor',
    position: { x: 200, y: 50, floor: 1, confidence: 0.78, timestamp: 1700000000000 },
    networks: [
      { id: 'w1', name: 'HallNet-1F', rssi: -40 },
      { id: 'w2', name: 'CampusWiFi', rssi: -60 },
    ],
  },
  {
    id: 'physics',
    label: 'Physics Lab — High interference',
    position: { x: 80, y: 180, floor: 3, confidence: 0.65, timestamp: 1700000000000 },
    networks: [
      { id: 'w1', name: 'PhysNet-3F', rssi: -45 },
      { id: 'w2', name: 'CampusWiFi', rssi: -75 },
      { id: 'w3', name: 'GuestNet', rssi: -80 },
      { id: 'w4', name: 'LabNet-2F', rssi: -85 },
    ],
  },
  {
    id: 'edge_case',
    label: 'Edge Case — Single network',
    position: { x: 0, y: 0, floor: 1, confidence: 0.3, timestamp: 1700000000000 },
    networks: [
      { id: 'w1', name: 'CampusWiFi', rssi: -90 },
    ],
  },
];

function getScenarioById(id: MockScenario['id']): MockScenario | undefined {
  return MOCK_SCENARIOS.find((s) => s.id === id);
}

function generateRandomNetwork(count: number): NetworkReading[] {
  const names = ['WiFi-A', 'WiFi-B', 'WiFi-C', 'WiFi-D', 'WiFi-E', 'WiFi-F'];
  return Array.from({ length: count }, (_, i) => ({
    id: `rand-${i}`,
    name: names[i % names.length],
    rssi: -30 - Math.floor(Math.random() * 60),
  }));
}

function generateRandomPosition(floor: number = 1): Position {
  return {
    x: Math.round(Math.random() * 300 * 100) / 100,
    y: Math.round(Math.random() * 300 * 100) / 100,
    floor: floor as 1 | 2 | 3,
    confidence: Math.round(Math.random() * 100) / 100,
    timestamp: Date.now(),
  };
}

describe('Mock Data Service', () => {
  describe('MOCK_SCENARIOS', () => {
    it('should have 4 scenarios', () => {
      expect(MOCK_SCENARIOS).toHaveLength(4);
    });

    it('each scenario should have valid id', () => {
      const validIds = ['lab_201', 'hall_1f', 'physics', 'edge_case'];
      MOCK_SCENARIOS.forEach((s) => {
        expect(validIds).toContain(s.id);
      });
    });

    it('each scenario should have non-empty networks', () => {
      MOCK_SCENARIOS.forEach((s) => {
        expect(s.networks.length).toBeGreaterThan(0);
      });
    });

    it('each scenario should have valid position floor', () => {
      MOCK_SCENARIOS.forEach((s) => {
        expect([1, 2, 3]).toContain(s.position.floor);
      });
    });
  });

  describe('getScenarioById', () => {
    it('should return scenario for valid id', () => {
      const scenario = getScenarioById('lab_201');
      expect(scenario).toBeDefined();
      expect(scenario!.label).toContain('Lab 201');
    });

    it('should return undefined for invalid id', () => {
      // @ts-expect-error testing invalid id
      expect(getScenarioById('nonexistent')).toBeUndefined();
    });
  });

  describe('generateRandomNetwork', () => {
    it('should generate specified count of networks', () => {
      const networks = generateRandomNetwork(3);
      expect(networks).toHaveLength(3);
    });

    it('each network should have id, name, rssi', () => {
      const networks = generateRandomNetwork(2);
      networks.forEach((n) => {
        expect(typeof n.id).toBe('string');
        expect(typeof n.name).toBe('string');
        expect(typeof n.rssi).toBe('number');
        expect(n.rssi).toBeLessThan(0);
      });
    });

    it('should generate 0 networks for 0 count', () => {
      expect(generateRandomNetwork(0)).toHaveLength(0);
    });
  });

  describe('generateRandomPosition', () => {
    it('should generate position with valid floor', () => {
      const pos = generateRandomPosition(2);
      expect(pos.floor).toBe(2);
    });

    it('should default to floor 1', () => {
      const pos = generateRandomPosition();
      expect(pos.floor).toBe(1);
    });

    it('should have confidence between 0 and 1', () => {
      const pos = generateRandomPosition();
      expect(pos.confidence).toBeGreaterThanOrEqual(0);
      expect(pos.confidence).toBeLessThanOrEqual(1);
    });

    it('should have positive timestamp', () => {
      const pos = generateRandomPosition();
      expect(pos.timestamp).toBeGreaterThan(0);
    });
  });
});
