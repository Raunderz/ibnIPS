import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

export type Network = {
  bssid: string;
  ssid: string | null;
  rssi: number;
  frequency?: number;
};

const { WifiScannerModule } = NativeModules;

class WifiService {
  private emitter = WifiScannerModule ? new NativeEventEmitter(WifiScannerModule) : null;
  private listener: any = null;
  private lastScans: Network[] = [];

  startScanning(onScansReceived: (scans: Network[]) => void): void {
    if (!WifiScannerModule) {
      console.warn('WifiScannerModule is not available on this platform.');
      return;
    }

    // Stop previous listener to prevent leaks
    this.stopScanning();

    this.listener = this.emitter?.addListener('wifiScansReceived', (event: { scans: any[] }) => {
      const rawScans = event.scans || [];
      
      // Transform, filter and sort
      const processedScans: Network[] = rawScans
        .filter((scan) => scan.bssid && (scan.rssi === undefined || scan.rssi >= -100))
        .map((scan) => ({
          bssid: scan.bssid,
          ssid: scan.ssid && scan.ssid.trim() !== '' ? scan.ssid : '(Hidden)',
          rssi: scan.rssi,
          frequency: scan.frequency,
        }))
        .sort((a, b) => b.rssi - a.rssi); // Strongest first

      this.lastScans = processedScans;
      onScansReceived(processedScans);
    });

    WifiScannerModule.startListening();
  }

  stopScanning(): void {
    if (this.listener) {
      this.listener.remove();
      this.listener = null;
    }
    if (WifiScannerModule) {
      WifiScannerModule.stopListening();
    }
  }

  getLastScans(): Network[] {
    return this.lastScans;
  }
}

export const wifiService = new WifiService();
