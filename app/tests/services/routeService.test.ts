// Test route service logic: serialization, validation and backend submit.

jest.mock('../../services/apiClient', () => ({
  pingBackend: jest.fn(),
  ROUTE_SUBMIT_TIMEOUT_MS: 5000,
}));

import { pingBackend } from '../../services/apiClient';
import {
  serializeRoute,
  serializePing,
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

describe('serializePing', () => {
  it('should map the first room to the schema first-room shape', () => {
    const entry = makeEntry({ order: 1, networks: [] });
    expect(serializePing(entry, '')).toEqual({
      name: 'Room 1',
      floor: 2,
      previous_node_id: '',
      steps: -1,
      direction: '',
      fingerprints: [],
    });
  });

  it('should chain the previous node id for linked rooms', () => {
    const entry = makeEntry({
      order: 2,
      steps_from_previous: 42,
      direction: 'NE',
    });
    expect(serializePing(entry, 'room_1_f1').previous_node_id).toBe('room_1_f1');
    expect(serializePing(entry, 'room_1_f1').steps).toBe(42);
    expect(serializePing(entry, 'room_1_f1').direction).toBe('NE');
  });

  it('should map networks to fingerprints (bssid/ssid/rssi)', () => {
    const entry = makeEntry({
      order: 2,
      steps_from_previous: 42,
      direction: 'N',
      networks: [
        { id: 'aa:bb:cc', name: 'IITB-WiFi', rssi: -65 },
        { id: 'dd:ee:ff', name: 'eduroam', rssi: -80 },
      ],
    });
    expect(serializePing(entry, 'prev').fingerprints).toEqual([
      { bssid: 'aa:bb:cc', ssid: 'IITB-WiFi', rssi: -65 },
      { bssid: 'dd:ee:ff', ssid: 'eduroam', rssi: -80 },
    ]);
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

  it('should resolve ok when the backend ping succeeds', async () => {
    mockedPingBackend.mockResolvedValue({
      status: 'created',
      node_id: 'lab_201_f2',
    });
    const result = await submitRoute(validTwoStopRoute());
    expect(result.ok).toBe(true);
    expect(result.responses).toHaveLength(2);
    expect(result.node_ids).toEqual(['lab_201_f2', 'lab_201_f2']);
    // One ping per room in the walk.
    expect(mockedPingBackend).toHaveBeenCalledTimes(2);
  });

  it('should chain the previous node id returned by each ping', async () => {
    let call = 0;
    mockedPingBackend.mockImplementation(async () => {
      call += 1;
      return { status: 'created', node_id: `node_${call}` };
    });
    const result = await submitRoute(validTwoStopRoute());
    expect(result.ok).toBe(true);
    expect(result.node_ids).toEqual(['node_1', 'node_2']);
    // First ping: empty previous_node_id; second ping chains node_1.
    expect(mockedPingBackend.mock.calls[0][0].previous_node_id).toBe('');
    expect(mockedPingBackend.mock.calls[1][0].previous_node_id).toBe('node_1');
  });

  it('should report backend unreachable when the ping throws', async () => {
    mockedPingBackend.mockRejectedValue(new Error('network down'));
    const result = await submitRoute(validTwoStopRoute());
    expect(result.ok).toBe(false);
    expect(result.error).toBe('backend unreachable');
  });
});
