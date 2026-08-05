// ICPS/hooks/useWifiScanning.ts
// Manages the Wi-Fi scanning lifecycle for a screen: permissions, start/stop,
// live state (scans, last update, count, error) and optional pause when the
// app goes to the background.

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, PermissionsAndroid, Platform } from 'react-native';
import type { Permission } from 'react-native';
import { wifiService, Network } from '../services/wifiService';
import {
  getSignalBars as getSignalBarsUtil,
  getSignalQuality as getSignalQualityUtil,
} from '../utils/wifi';

export interface UseWifiScanningOptions {
  enabled?: boolean;
  pauseInBackground?: boolean;
}

async function ensureWifiPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  const permissions: Permission[] = [
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  ];

  // Android 13+ uses the nearby devices permission for Wi-Fi scans.
  if ((Platform.Version as number) >= 33) {
    permissions.push(PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES);
  }

  const results = await PermissionsAndroid.requestMultiple(permissions);
  return permissions.every((p) => results[p] === PermissionsAndroid.RESULTS.GRANTED);
}

export function useWifiScanning(options: UseWifiScanningOptions = {}) {
  const { enabled = true, pauseInBackground = false } = options;

  const [scans, setScans] = useState<Network[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const appState = useRef(AppState.currentState);
  const scanningRef = useRef(false);

  const handleScansReceived = useCallback((networks: Network[]) => {
    setScans(networks);
    setLastUpdate(new Date());
    setScanCount((count) => count + 1);
  }, []);

  const startScanning = useCallback(async () => {
    if (!wifiService.isSupported) {
      setError('Unable to initialize Wi-Fi scanner');
      setIsScanning(false);
      return;
    }

    const granted = await ensureWifiPermissions();
    if (!granted) {
      setError('Wi-Fi permission required');
      setIsScanning(false);
      return;
    }

    setError(null);
    scanningRef.current = true;
    wifiService.startScanning(handleScansReceived);
    setIsScanning(true);
  }, [handleScansReceived]);

  const stopScanning = useCallback(() => {
    scanningRef.current = false;
    wifiService.stopScanning();
    setIsScanning(false);
  }, []);

  // Pause/resume scanning when the app goes to the background, if requested.
  useEffect(() => {
    if (!pauseInBackground) {
      return;
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      const previousState = appState.current;
      appState.current = nextState;

      if (nextState === 'background' && previousState === 'active' && scanningRef.current) {
        wifiService.stopScanning();
        setIsScanning(false);
      } else if (nextState === 'active' && previousState !== 'active' && scanningRef.current) {
        wifiService.startScanning(handleScansReceived);
        setIsScanning(true);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [pauseInBackground, handleScansReceived]);

  // Start scanning on mount and tear it down on unmount.
  useEffect(() => {
    if (!enabled) {
      return;
    }

    startScanning();

    return () => {
      stopScanning();
    };
  }, [enabled, startScanning, stopScanning]);

  const getSignalBars = useCallback((rssi: number) => getSignalBarsUtil(rssi), []);
  const getSignalQuality = useCallback((rssi: number) => getSignalQualityUtil(rssi), []);

  return {
    scans,
    isScanning,
    lastUpdate,
    scanCount,
    error,
    startScanning,
    stopScanning,
    getSignalBars,
    getSignalQuality,
  };
}
