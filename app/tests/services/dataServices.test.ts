// Test the real mockDataService and positionService modules (pure logic, no
// react-native imports) rather than the local copies used elsewhere.

import {
  getMockScenario,
  getAllMockScenarios,
  getRandomJitteredPosition,
} from '../../services/mockDataService';
import { getNextPosition } from '../../services/positionService';
import type { Position } from '../../types';

describe('mockDataService (real module)', () => {
  it('exposes all five mock scenarios', () => {
    expect(getAllMockScenarios()).toHaveLength(5);
  });

  it('returns a complete scenario for a valid id', () => {
    const scenario = getMockScenario('lab_201');
    expect(scenario.id).toBe('lab_201');
    expect(scenario.label).toBe('Inject: Lab 201');
    expect(scenario.position.floor).toBe(2);
    expect(scenario.position.confidence).toBe(90);
    expect(scenario.networks.length).toBeGreaterThan(0);
  });

  it('refreshes the timestamp on every request', () => {
    const before = Date.now();
    const scenario = getMockScenario('ground');
    expect(scenario.position.timestamp).toBeGreaterThanOrEqual(before - 1);
  });

  it('every scenario carries a position and networks', () => {
    for (const scenario of getAllMockScenarios()) {
      expect(scenario.position).toBeDefined();
      expect(typeof scenario.position.confidence).toBe('number');
      expect(Array.isArray(scenario.networks)).toBe(true);
    }
  });

it('jitters a base position within the Â±5 unit range', () => {
    const base: Position = { x: 100, y: 200, floor: 0, confidence: 85, timestamp: 1700000000000 };
    const jittered = getRandomJitteredPosition(base);
    expect(jittered.floor).toBe(0);
    expect(jittered.confidence).toBeGreaterThanOrEqual(80);
    expect(jittered.confidence).toBeLessThanOrEqual(90);
    expect(Math.abs(jittered.x - 100)).toBeLessThanOrEqual(5);
    expect(Math.abs(jittered.y - 200)).toBeLessThanOrEqual(5);
    expect(jittered.timestamp).toBeGreaterThanOrEqual(base.timestamp);
  });
});

describe('positionService.getNextPosition (real module)', () => {
  const base: Position = { x: 50, y: 60, floor: 1, confidence: 70, timestamp: 1700000000000 };

  it('jitters around the base position in mock mode', async () => {
    const result = await getNextPosition(true, base);
    expect(result.floor).toBe(base.floor);
    expect(Math.abs(result.x - 50)).toBeLessThanOrEqual(5);
    expect(Math.abs(result.y - 60)).toBeLessThanOrEqual(5);
  });

  it('rejects when mock mode has no base position', async () => {
    await expect(getNextPosition(true)).rejects.toThrow('Mock mode requires a base position');
  });

  it('delegates to the backend API outside mock mode', async () => {
    // apiClient.fetchCurrentPosition is a placeholder that throws for now.
    await expect(getNextPosition(false, base)).rejects.toThrow(/not implemented/i);
  });
});
