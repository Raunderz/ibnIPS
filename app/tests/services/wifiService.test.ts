// Test WifiService — the real bridge to the native WifiScannerModule.
// Mocks react-native's NativeModules/NativeEventEmitter so the native listener
// wiring can be exercised in a plain Node/Jest environment.

type ScanHandler = (payload: any) => void;

const mockListeners: Record<string, ScanHandler> = {};
const mockStartScanning = jest.fn();
const mockStopScanning = jest.fn();
const mockGetLastScans = jest.fn();

jest.mock('react-native', () => ({
  NativeModules: {
    WifiScanner: {
      startScanning: mockStartScanning,
      stopScanning: mockStopScanning,
      getLastScans: mockGetLastScans,
    },
  },
  NativeEventEmitter: jest.fn().mockImplementation(() => ({
    addListener: (event: string, cb: ScanHandler) => {
      mockListeners[event] = cb;
      return { remove: jest.fn() };
    },
  })),
}));

import { wifiService } from '../../services/wifiService';

describe('WifiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockListeners).forEach((key) => delete mockListeners[key]);
  });

  afterEach(() => {
    wifiService.stopScanning();
  });

  it('reports support when the native module is present', () => {
    expect(wifiService.isSupported).toBe(true);
  });

  it('starts native scanning and registers a listener', () => {
    const cb = jest.fn();
    wifiService.startScanning(cb);
    expect(mockStartScanning).toHaveBeenCalledTimes(1);
    expect(mockListeners.wifiScansReceived).toBeDefined();
  });

  it('normalizes, dedupes, sorts and filters emitted scans', () => {
    const cb = jest.fn();
    wifiService.startScanning(cb);

    mockListeners.wifiScansReceived({
      scans: [
        { bssid: 'AA', ssid: 'net-a', rssi: -60, frequency: 2450 },
        { bssid: 'BB', ssid: null, rssi: -85, frequency: 5180 },
        { bssid: 'AA', ssid: 'net-a', rssi: -55, frequency: 2450 },
        { bssid: 'CC', ssid: 'weak', rssi: -120, frequency: 2450 },
      ],
    });

    const received = cb.mock.calls[0][0];
    expect(received).toEqual([
      { bssid: 'AA', ssid: 'net-a', rssi: -55, frequency: 2450 },
      { bssid: 'BB', ssid: null, rssi: -85, frequency: 5180 },
    ]);
  });

  it('accepts a bare array payload', () => {
    const cb = jest.fn();
    wifiService.startScanning(cb);
    mockListeners.wifiScansReceived([{ bssid: 'X', rssi: -70, frequency: 0 }]);
    expect(cb.mock.calls[0][0]).toEqual([{ bssid: 'X', ssid: null, rssi: -70, frequency: 0 }]);
  });

  it('clamps out-of-range rssi values', () => {
    const cb = jest.fn();
    wifiService.startScanning(cb);
    mockListeners.wifiScansReceived({ scans: [{ bssid: 'Y', rssi: 10, frequency: 0 }] });
    expect(cb.mock.calls[0][0]).toEqual([{ bssid: 'Y', ssid: null, rssi: 0, frequency: 0 }]);
  });

  it('keeps the last scan results in memory', () => {
    const cb = jest.fn();
    wifiService.startScanning(cb);
    mockListeners.wifiScansReceived({ scans: [{ bssid: 'Z', rssi: -70, frequency: 2450 }] });
    expect(wifiService.getLastScans()).toHaveLength(1);
  });

  it('does not re-subscribe on a second start while active', () => {
    const cb = jest.fn();
    wifiService.startScanning(cb);
    wifiService.startScanning(cb);
    expect(mockStartScanning).toHaveBeenCalledTimes(1);
  });

  it('stops scanning, clears listeners and resets last scans', () => {
    const cb = jest.fn();
    wifiService.startScanning(cb);
    mockListeners.wifiScansReceived({ scans: [{ bssid: 'K', rssi: -70, frequency: 2450 }] });
    wifiService.stopScanning();
    expect(mockStopScanning).toHaveBeenCalled();
    expect(wifiService.getLastScans()).toEqual([]);
  });

  it('classifies usable rssi against the threshold', () => {
    expect(wifiService.isUsableRssi(-60)).toBe(true);
    expect(wifiService.isUsableRssi(-100)).toBe(true);
    expect(wifiService.isUsableRssi(-110)).toBe(false);
  });
});