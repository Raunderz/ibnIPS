// Test route service logic: serialization, validation and backend submit.

jest.mock('../../services/apiClient', () => ({
  pingBackend: jest.fn(),
  ROUTE_SUBMIT_TIMEOUT_MS: 5000,
}));

import { pingBackend } from '../../services/apiClient';
import {
  serializeRoute,
  validateRouteEntry,
  validateRoute,
  submitRoute,
} from '../../services/routeService';
import { RouteEntry, RouteCollection } from '../../types';

const mockedPingBackend = pingBackend as jest.MockedFunction<typeof pingBackend>;

function makeEntry(overrides: Partial<RouteEntry> = {}): RouteEntry {
  return {
    room_id: 'room_1',
    room_name: 'Room 1',
    floor: 2,
    order: 1,
    steps_from_previous: null,
    direction: null,
    timestamp: 1234567890,
    editable: true,
    x: 100,
    y: 200,
    confidence: 85,
    networks: [],
    ...overrides,
  };
}

function validTwoStopRoute(): RouteCollection {
  return [
    makeEntry({ order: 1, floor: 2 }),
    makeEntry({
      order: 2,
      floor: 2,
      steps_from_previous: 42,
      direction: 'NE',
    }),
  ];
}

describe('serializeRoute', () => {
  it('should map entries to the serialized backend shape', () => {
    const collection: RouteCollection = [
      makeEntry({ order: 1 }),
      makeEntry({
        order: 2,
        room_id: 'room_2',
        room_name: 'Room 2',
        steps_from_previous: 42,
        direction: 'NE',
      }),
    ];
    expect(serializeRoute(collection)).toEqual({
      route: [
        { room_id: 'room_1', steps_from_previous: null, direction: null },
        { room_id: 'room_2', steps_from_previous: 42, direction: 'NE' },
      ],
    });
  });

  it('should omit non-payload fields like timestamp and editable', () => {
    const serialized = serializeRoute([makeEntry()]);
    expect(serialized.route[0]).not.toHaveProperty('timestamp');
    expect(serialized.route[0]).not.toHaveProperty('editable');
    expect(serialized.route[0]).not.toHaveProperty('room_name');
  });
});

describe('validateRouteEntry', () => {
  it('should reject empty room_id', () => {
    expect(validateRouteEntry(makeEntry({ room_id: '' }))).toMatch(/non-empty/i);
  });

  it('should allow first entry with null steps and direction', () => {
    expect(validateRouteEntry(makeEntry({ order: 1 }))).toBeNull();
  });

  it('should reject first entry with steps', () => {
    expect(validateRouteEntry(makeEntry({ order: 1, steps_from_previous: 10 }))).toMatch(
      /cannot have steps/i
    );
  });

  it('should reject first entry with direction', () => {
    expect(validateRouteEntry(makeEntry({ order: 1, direction: 'N' }))).toMatch(
      /cannot have direction/i
    );
  });

  it('should require positive integer steps for subsequent entries', () => {
    const base = { order: 2, direction: 'NE' as const };
    expect(validateRouteEntry(makeEntry({ ...base, steps_from_previous: -5 }))).toMatch(
      /positive integer/i
    );
    expect(validateRouteEntry(makeEntry({ ...base, steps_from_previous: 0 }))).toMatch(
      /positive integer/i
    );
    expect(validateRouteEntry(makeEntry({ ...base, steps_from_previous: null }))).toMatch(
      /positive integer/i
    );
    expect(validateRouteEntry(makeEntry({ ...base, steps_from_previous: 42 }))).toBeNull();
  });

  it('should require a valid 8-point direction for subsequent entries', () => {
    const base = { order: 2, steps_from_previous: 42 };
    expect(validateRouteEntry(makeEntry({ ...base, direction: null }))).toMatch(/direction/i);
    expect(validateRouteEntry(makeEntry({ ...base, direction: 'UP' as never }))).toMatch(
      /direction/i
    );
    expect(validateRouteEntry(makeEntry({ ...base, direction: 'SE' }))).toBeNull();
  });
});

describe('validateRoute', () => {
  it('should require at least 2 locations', () => {
    expect(validateRoute([makeEntry()])).toMatch(/at least 2/i);
  });

  it('should reject mixed floors', () => {
    const collection: RouteCollection = [
      makeEntry({ order: 1, floor: 1 }),
      makeEntry({
        order: 2,
        floor: 2,
        steps_from_previous: 42,
        direction: 'N',
      }),
    ];
    expect(validateRoute(collection)).toMatch(/same floor/i);
  });

  it('should pass a valid two-location route', () => {
    expect(validateRoute(validTwoStopRoute())).toBeNull();
  });
});

describe('submitRoute', () => {
  beforeEach(() => {
    mockedPingBackend.mockReset();
  });

  it('should return a validation error for a single location without calling the backend', async () => {
    const result = await submitRoute([makeEntry()]);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/at least 2/i);
    expect(mockedPingBackend).not.toHaveBeenCalled();
  });

  it('should resolve ok when the backend pong succeeds', async () => {
    mockedPingBackend.mockResolvedValue({
      status: 'pong',
      route_received: 2,
      message: 'Route data received (not yet stored)',
    });
    const result = await submitRoute(validTwoStopRoute());
    expect(result.ok).toBe(true);
    expect(result.response?.status).toBe('pong');
    expect(result.response?.route_received).toBe(2);
    expect(mockedPingBackend).toHaveBeenCalledTimes(1);
  });

  it('should report backend unreachable when the ping throws', async () => {
    mockedPingBackend.mockRejectedValue(new Error('network down'));
    const result = await submitRoute(validTwoStopRoute());
    expect(result.ok).toBe(false);
    expect(result.error).toBe('backend unreachable');
  });
});
