// Test real Wi-Fi → Position resolution used by live (non-mock) map mode.

import { getPositionFromScans } from '../../services/positionService';

describe('getPositionFromScans', () => {
  it('should return null when there are no scans', () => {
    expect(getPositionFromScans([], 2)).toBeNull();
  });

  it('should return a position on the requested floor', () => {
    const pos = getPositionFromScans([{ rssi: -60 }], 2);
    expect(pos).not.toBeNull();
    expect(pos!.floor).toBe(2);
  });

  it('should keep the pin inside the navigable map area', () => {
    const pos = getPositionFromScans([{ rssi: -60 }], 2);
    expect(pos!.x).toBeGreaterThanOrEqual(64);
    expect(pos!.x).toBeLessThanOrEqual(448);
    expect(pos!.y).toBeGreaterThanOrEqual(64);
    expect(pos!.y).toBeLessThanOrEqual(448);
  });

  it('should be deterministic for the same scan set', () => {
    const scans = [{ rssi: -55, bssid: 'aa:bb:cc:dd:ee:01' }];
    const a = getPositionFromScans(scans, 1)!;
    const b = getPositionFromScans(scans, 1)!;
    expect(a.x).toBe(b.x);
    expect(a.y).toBe(b.y);
  });

  it('should move the pin when the dominant AP changes (no more lag)', () => {
    const apA = getPositionFromScans([{ rssi: -50, bssid: 'aa:bb:cc:dd:ee:01' }], 1)!;
    const apB = getPositionFromScans([{ rssi: -50, bssid: 'aa:bb:cc:dd:ee:02' }], 1)!;
    expect(apA.x).not.toBe(apB.x);
    expect(apA.y).not.toBe(apB.y);
  });

  it('should pull the centroid toward the strongest AP', () => {
    const strongAlone = getPositionFromScans(
      [{ rssi: -45, bssid: 'aa:bb:cc:dd:ee:01' }],
      1
    )!;
    const weakAlone = getPositionFromScans(
      [{ rssi: -95, bssid: 'aa:bb:cc:dd:ee:02' }],
      1
    )!;
    const combined = getPositionFromScans(
      [
        { rssi: -45, bssid: 'aa:bb:cc:dd:ee:01' },
        { rssi: -95, bssid: 'aa:bb:cc:dd:ee:02' },
      ],
      1
    )!;
    const distToStrong = Math.hypot(combined.x - strongAlone.x, combined.y - strongAlone.y);
    const distToWeak = Math.hypot(combined.x - weakAlone.x, combined.y - weakAlone.y);
    expect(distToStrong).toBeLessThan(distToWeak);
  });

  it('should derive confidence from the strongest AP RSSI', () => {
    const scans = [
      { rssi: -88, bssid: 'aa:bb:cc:dd:ee:01' },
      { rssi: -62, bssid: 'aa:bb:cc:dd:ee:02' },
      { rssi: -45, bssid: 'aa:bb:cc:dd:ee:03' },
    ];
    const pos = getPositionFromScans(scans, 1);
    // Strongest is -45 → quality = 2 * (-45 + 100) = 110 → clamped to 100
    expect(pos!.confidence).toBe(100);
  });

  it('should pick the strongest even when it is not the first entry', () => {
    const scans = [
      { rssi: -70, bssid: 'aa:bb:cc:dd:ee:01' },
      { rssi: -55, bssid: 'aa:bb:cc:dd:ee:02' },
      { rssi: -80, bssid: 'aa:bb:cc:dd:ee:03' },
    ];
    const pos = getPositionFromScans(scans, 3);
    expect(pos!.confidence).toBe(90); // 2 * (-55 + 100)
  });

  it('should clamp confidence to 0 for unusable signals', () => {
    const pos = getPositionFromScans([{ rssi: -110 }], 0);
    expect(pos!.confidence).toBe(0);
  });

  it('should clamp confidence to 100 for very strong signals', () => {
    const pos = getPositionFromScans([{ rssi: -30 }], 0);
    expect(pos!.confidence).toBe(100);
  });

  it('should record a numeric timestamp', () => {
    const pos = getPositionFromScans([{ rssi: -50 }], 1);
    expect(typeof pos!.timestamp).toBe('number');
    expect(pos!.timestamp).toBeGreaterThan(0);
  });
});
