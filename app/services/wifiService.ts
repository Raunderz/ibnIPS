// ICPS/services/wifiService.ts
// Bridge between the React layer and the native Android WifiScannerModule.

import { NativeModules, NativeEventEmitter } from 'react-native';
import {
  dedupeAndSortByStrength,
  isRssiUsable,
  clampRssi,
} from '../utils/wifi';
import { MIN_RSSI_THRESHOLD } from '../utils/constants';

export interface Network {
  bssid: string;
  ssid: string | null;
  rssi: number;
  frequency: number;
}

interface NativeWifiScanner {
  startScanning(): void;
  stopScanning(): void;
  getLastScans(): void;
}

const WifiScanner = NativeModules.WifiScanner as NativeWifiScanner | undefined;

// The native module emits events through the global device event emitter, so we
// use the no-argument constructor (passing the module would require it to
// implement addListener/removeListeners for the new NativeEventEmitter API).
const eventEmitter = new NativeEventEmitter();

const SCANS_EVENT = 'wifiScansReceived';

class WifiService {
  private subscription: any = null;
  private lastScans: Network[] = [];

  /**
   * True when the native module is available on this platform/build.
   */
  get isSupported(): boolean {
    return !!WifiScanner;
  }

  /**
   * Start listening for Wi-Fi scan results. `onScansReceived` is invoked on
   * every native scan event with a deduplicated, strongest-first list.
   */
  startScanning(onScansReceived: (scans: Network[]) => void): void {
    if (!WifiScanner) {
      console.error('WifiScanner module not available');
      return;
    }

    if (this.subscription) {
      return; // Already listening
    }

    this.subscription = eventEmitter.addListener(
      SCANS_EVENT,
      (payload: { scans?: Network[] } | Network[]) => {
        const raw = Array.isArray(payload)
          ? payload
          : (payload && Array.isArray(payload.scans) ? payload.scans : []);

        const normalized: Network[] = raw.map((network) => ({
          bssid: network.bssid,
          ssid: network.ssid ?? null,
          rssi: clampRssi(network.rssi),
          frequency: network.frequency ?? 0,
        }));

        const prepared = dedupeAndSortByStrength(normalized).filter((n) =>
          isRssiUsable(n.rssi)
        );

        this.lastScans = prepared;
        onScansReceived(prepared);
      }
    );

    WifiScanner.startScanning();
  }

  /**
   * Stop listening for scans and free native resources.
   */
  stopScanning(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }

    if (WifiScanner) {
      WifiScanner.stopScanning();
    }

    this.lastScans = [];
  }

  /**
   * Return the most recent scan results kept in memory.
   */
  getLastScans(): Network[] {
    return this.lastScans;
  }

  /**
   * Filter RSSI values below the usable threshold.
   */
  isUsableRssi(rssi: number): boolean {
    return rssi >= MIN_RSSI_THRESHOLD;
  }
}

export const wifiService = new WifiService();
