// ICPS/utils/wifi.ts
// Pure helpers for Wi-Fi signal display. Kept free of React Native imports so
// the logic can be unit tested in a plain Node environment.

import { MIN_RSSI_THRESHOLD, MAX_NETWORKS_DISPLAY } from './constants';

/**
 * Map an RSSI value (dBm) to a visual signal strength bar count (0-8).
 * Thresholds come from the Wi-Fi Scanning spec.
 */
export function getSignalBars(rssi: number): number {
  if (rssi >= -50) return 8;
  if (rssi >= -60) return 7;
  if (rssi >= -70) return 6;
  if (rssi >= -80) return 5;
  if (rssi >= -90) return 4;
  if (rssi >= -100) return 2;
  return 0; // Below usable threshold
}

/**
 * Convert an RSSI value to a 0-100 quality percentage.
 * Assumes -100 dBm is the usable floor and -50 dBm is excellent.
 */
export function getSignalQuality(rssi: number): number {
  const quality = 2 * (rssi + 100);
  return Math.max(0, Math.min(100, quality));
}

/**
 * Clamp RSSI to the valid dBm range [-120, 0].
 */
export function clampRssi(rssi: number): number {
  if (rssi > 0) return 0;
  if (rssi < -120) return -120;
  return rssi;
}

/**
 * Human-readable frequency band label from channel frequency in MHz.
 */
export function getFrequencyBand(frequency: number): string {
  if (frequency >= 5000) return '5 GHz';
  if (frequency >= 2400 && frequency <= 2499) return '2.4 GHz';
  if (frequency >= 3600 && frequency <= 3700) return '6 GHz';
  return `${frequency} MHz`;
}

/**
 * Is this RSSI usable for positioning?
 */
export function isRssiUsable(rssi: number): boolean {
  return rssi >= MIN_RSSI_THRESHOLD;
}

/**
 * Deduplicate networks by BSSID, keeping the strongest RSSI per BSSID,
 * then sort strongest-first.
 */
export function dedupeAndSortByStrength<T extends { bssid: string; rssi: number }>(
  networks: T[]
): T[] {
  const byBssid = new Map<string, T>();
  for (const network of networks) {
    const existing = byBssid.get(network.bssid);
    if (!existing || network.rssi > existing.rssi) {
      byBssid.set(network.bssid, network);
    }
  }
  return Array.from(byBssid.values()).sort((a, b) => b.rssi - a.rssi);
}

/**
 * Truncate a network list to the top N by strength (they are expected to be
 * pre-sorted). Returns the original array when it is already small enough.
 */
export function truncateToTop<T>(networks: T[], max: number = MAX_NETWORKS_DISPLAY): T[] {
  if (networks.length <= max) return networks;
  return networks.slice(0, max);
}
