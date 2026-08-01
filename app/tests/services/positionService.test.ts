import type { Position, NetworkReading, FloorNumber } from '../types/index';

// Pure utility functions extracted for testing.
// These represent the core logic that positionService would implement.

function calculateDistance(rssi: number, txPower: number = -50, n: number = 2.5): number {
  return Math.pow(10, (txPower - rssi) / (10 * n));
}

function filterNetworksByRssi(networks: NetworkReading[], threshold: number = -80): NetworkReading[] {
  return networks.filter((n) => n.rssi > threshold);
}

function calculateConfidence(networkCount: number, avgRssi: number): number {
  const networkFactor = Math.min(networkCount / 5, 1);
  const rssiFactor = Math.min((avgRssi + 100) / 50, 1);
  return Math.round((networkFactor * 0.6 + rssiFactor * 0.4) * 100) / 100;
}

function interpolatePosition(
  readings: { position: Position; weight: number }[]
): { x: number; y: number } {
  let totalWeight = 0;
  let weightedX = 0;
  let weightedY = 0;

  for (const reading of readings) {
    totalWeight += reading.weight;
    weightedX += reading.position.x * reading.weight;
    weightedY += reading.position.y * reading.weight;
  }

  if (totalWeight === 0) return { x: 0, y: 0 };

  return {
    x: Math.round((weightedX / totalWeight) * 100) / 100,
    y: Math.round((weightedY / totalWeight) * 100) / 100,
  };
}

function detectFloor(networks: NetworkReading[]): FloorNumber {
  // Simplified: in a real app this would compare fingerprints
  if (networks.length === 0) return 1;
  const avgRssi = networks.reduce((sum, n) => sum + n.rssi, 0) / networks.length;
  if (avgRssi > -50) return 1;
  if (avgRssi > -65) return 2;
  return 3;
}

describe('Position Calculation Logic', () => {
  describe('calculateDistance', () => {
    it('should calculate distance from RSSI', () => {
      const distance = calculateDistance(-50);
      expect(distance).toBeCloseTo(1, 0);
    });

    it('should return larger distance for weaker signal', () => {
      const near = calculateDistance(-40);
      const far = calculateDistance(-80);
      expect(far).toBeGreaterThan(near);
    });

    it('should handle custom txPower and path loss exponent', () => {
      const d = calculateDistance(-60, -40, 3.0);
      expect(d).toBeGreaterThan(0);
    });
  });

  describe('filterNetworksByRssi', () => {
    const networks: NetworkReading[] = [
      { id: '1', name: 'Strong', rssi: -30 },
      { id: '2', name: 'Medium', rssi: -60 },
      { id: '3', name: 'Weak', rssi: -90 },
    ];

    it('should filter out weak signals', () => {
      const filtered = filterNetworksByRssi(networks, -80);
      expect(filtered).toHaveLength(2);
      expect(filtered.map((n) => n.name)).toContain('Strong');
      expect(filtered.map((n) => n.name)).toContain('Medium');
    });

    it('should keep all with default threshold (>-80)', () => {
      const filtered = filterNetworksByRssi(networks);
      expect(filtered).toHaveLength(2);
      expect(filtered.map((n) => n.name)).toContain('Strong');
      expect(filtered.map((n) => n.name)).toContain('Medium');
    });

    it('should return empty for very strict threshold', () => {
      const filtered = filterNetworksByRssi(networks, -20);
      expect(filtered).toHaveLength(0);
    });
  });

  describe('calculateConfidence', () => {
    it('should return higher confidence with more networks', () => {
      const low = calculateConfidence(1, -70);
      const high = calculateConfidence(5, -40);
      expect(high).toBeGreaterThan(low);
    });

    it('should return higher confidence with stronger signals', () => {
      const weak = calculateConfidence(3, -90);
      const strong = calculateConfidence(3, -30);
      expect(strong).toBeGreaterThan(weak);
    });

    it('should be between 0 and 1', () => {
      const c = calculateConfidence(3, -50);
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(1);
    });
  });

  describe('interpolatePosition', () => {
    it('should return weighted average position', () => {
      const readings = [
        { position: { x: 0, y: 0, floor: 1, confidence: 1, timestamp: 0 }, weight: 1 },
        { position: { x: 10, y: 10, floor: 1, confidence: 1, timestamp: 0 }, weight: 1 },
      ];
      const result = interpolatePosition(readings);
      expect(result.x).toBe(5);
      expect(result.y).toBe(5);
    });

    it('should weight closer access points more', () => {
      const readings = [
        { position: { x: 0, y: 0, floor: 1, confidence: 1, timestamp: 0 }, weight: 3 },
        { position: { x: 10, y: 10, floor: 1, confidence: 1, timestamp: 0 }, weight: 1 },
      ];
      const result = interpolatePosition(readings);
      expect(result.x).toBe(2.5);
      expect(result.y).toBe(2.5);
    });

    it('should return 0,0 for empty readings', () => {
      const result = interpolatePosition([]);
      expect(result).toEqual({ x: 0, y: 0 });
    });
  });

  describe('detectFloor', () => {
    it('should return floor 1 for strong signals', () => {
      const networks: NetworkReading[] = [
        { id: '1', name: 'A', rssi: -30 },
        { id: '2', name: 'B', rssi: -40 },
      ];
      expect(detectFloor(networks)).toBe(1);
    });

    it('should return floor 2 for medium signals', () => {
      const networks: NetworkReading[] = [
        { id: '1', name: 'A', rssi: -55 },
        { id: '2', name: 'B', rssi: -60 },
      ];
      expect(detectFloor(networks)).toBe(2);
    });

    it('should return floor 3 for weak signals', () => {
      const networks: NetworkReading[] = [
        { id: '1', name: 'A', rssi: -70 },
        { id: '2', name: 'B', rssi: -75 },
      ];
      expect(detectFloor(networks)).toBe(3);
    });

    it('should default to floor 1 for empty networks', () => {
      expect(detectFloor([])).toBe(1);
    });
  });
});
