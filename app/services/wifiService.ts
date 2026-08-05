// app/services/wifiService.ts

import { NativeModules, NativeEventEmitter } from 'react-native';

export interface Network {
  bssid: string;
  ssid: string | null;
  rssi: number;
  frequency: number;
}

const { WifiScanner } = NativeModules;

class WifiService {
  private eventEmitter: NativeEventEmitter | null = null;
  private subscription: any = null;
  private lastScans: Network[] = [];

  constructor() {
    if (WifiScanner) {
      this.eventEmitter = new NativeEventEmitter(WifiScanner);
    }
  }

  /**
   * Start Wi-Fi scanning and listen for results
   */
  startScanning(onScansReceived: (scans: Network[]) => void): void {
    if (!WifiScanner) {
      console.error('WifiScanner module not available');
      return;
    }

    if (this.subscription) {
      return; // Already listening
    }

    // Listen for scan results from native module
    this.subscription = this.eventEmitter?.addListener(
      'wifiScansReceived',
      (networks: Network[]) => {
        // Sort by RSSI (strongest first)
        const sorted = networks.sort((a, b) => b.rssi - a.rssi);
        
        // Filter out weak signals (< -100 dBm)
        const filtered = sorted.filter(n => n.rssi >= -100);
        
        this.lastScans = filtered;
        onScansReceived(filtered);
      }
    );

    // Start scanning on native side
    WifiScanner.startScanning();
  }

  /**
   * Stop Wi-Fi scanning
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
   * Get the last scanned networks
   */
  getLastScans(): Network[] {
    return this.lastScans;
  }

  /**
   * Get signal strength in bars (0-8)
   */
  getSignalBars(rssi: number): number {
    if (rssi >= -50) return 8;
    if (rssi >= -60) return 7;
    if (rssi >= -70) return 6;
    if (rssi >= -80) return 5;
    if (rssi >= -90) return 4;
    if (rssi >= -100) return 2;
    return 0; // No signal
  }

  /**
   * Get signal quality percentage
   */
  getSignalQuality(rssi: number): number {
    const quality = 2 * (rssi + 100);
    return Math.max(0, Math.min(100, quality));
  }
}

export const wifiService = new WifiService();