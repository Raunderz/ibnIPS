// Test route state store logic (in-memory route collection).

import {
  addToRoute,
  updateRoute,
  deleteFromRoute,
  clearRoute,
  getRoute,
} from '../../hooks/useRoute';
import { NetworkReading } from '../../types';

describe('useRoute store logic', () => {
  beforeEach(() => {
    clearRoute();
  });

  const mockPosition = { x: 100, y: 200, confidence: 85 };
  const mockNetworks: NetworkReading[] = [];

  it('should start empty', () => {
    expect(getRoute()).toEqual([]);
  });

  it('should add a first entry with null steps and direction', () => {
    addToRoute('room_1', 'Room 1', 2, mockPosition, mockNetworks);
    const route = getRoute();
    expect(route).toHaveLength(1);
    expect(route[0]).toMatchObject({
      room_id: 'room_1',
      room_name: 'Room 1',
      floor: 2,
      order: 1,
      steps_from_previous: null,
      direction: null,
      editable: true,
    });
  });

  it('should increment order for each added entry', () => {
    addToRoute('room_1', 'Room 1', 2, mockPosition, mockNetworks);
    addToRoute('room_2', 'Room 2', 2, mockPosition, mockNetworks);
    addToRoute('room_3', 'Room 3', 2, mockPosition, mockNetworks);
    const route = getRoute();
    expect(route.map((e) => e.order)).toEqual([1, 2, 3]);
  });

  it('should update steps and direction on an entry', () => {
    addToRoute('room_1', 'Room 1', 2, mockPosition, mockNetworks);
    addToRoute('room_2', 'Room 2', 2, mockPosition, mockNetworks);
    const error = updateRoute(1, { steps: 42, direction: 'NE' });
    expect(error).toBeNull();
    expect(getRoute()[1]).toMatchObject({ steps_from_previous: 42, direction: 'NE' });
  });

  it('should reject invalid steps via updateRoute', () => {
    addToRoute('room_1', 'Room 1', 2, mockPosition, mockNetworks);
    addToRoute('room_2', 'Room 2', 2, mockPosition, mockNetworks);
    expect(() => updateRoute(1, { steps: -5, direction: 'NE' })).toThrow(/positive integer/i);
  });

  it('should update room when provided', () => {
    addToRoute('room_1', 'Room 1', 2, mockPosition, mockNetworks);
    addToRoute('room_2', 'Room 2', 2, mockPosition, mockNetworks);
    updateRoute(1, { steps: 42, direction: 'NE' });
    updateRoute(1, { room_id: 'room_3', room_name: 'Room 3' });
    expect(getRoute()[1]).toMatchObject({ room_id: 'room_3', room_name: 'Room 3' });
  });

  it('should return an error for an out-of-range index', () => {
    expect(updateRoute(99, { steps: 10 })).toMatch(/not found/i);
  });

  it('should delete an entry and reset the following entry hop', () => {
    addToRoute('room_1', 'Room 1', 2, mockPosition, mockNetworks);
    addToRoute('room_2', 'Room 2', 2, mockPosition, mockNetworks);
    addToRoute('room_3', 'Room 3', 2, mockPosition, mockNetworks);
    updateRoute(1, { steps: 42, direction: 'NE' });
    updateRoute(2, { steps: 38, direction: 'SE' });

    deleteFromRoute(1);

    const route = getRoute();
    expect(route).toHaveLength(2);
    // The old third entry becomes order 2 and its hop is reset.
    expect(route[1]).toMatchObject({
      room_id: 'room_3',
      order: 2,
      steps_from_previous: null,
      direction: null,
    });
    expect(route[0].order).toBe(1);
  });

  it('should ignore delete for out-of-range index', () => {
    addToRoute('room_1', 'Room 1', 2, mockPosition, mockNetworks);
    const before = getRoute();
    deleteFromRoute(5);
    expect(getRoute()).toEqual(before);
  });

  it('should clear the route', () => {
    addToRoute('room_1', 'Room 1', 2, mockPosition, mockNetworks);
    addToRoute('room_2', 'Room 2', 2, mockPosition, mockNetworks);
    clearRoute();
    expect(getRoute()).toEqual([]);
  });
});
