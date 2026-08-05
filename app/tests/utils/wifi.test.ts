// Test Wi-Fi signal helpers — validates bar mapping, quality, clamping and
// the dedupe/sort logic used by the live scan list.

import {
  getSignalBars,
  getSignalQuality,
  clampRssi,
  getFrequencyBand,
  isRssiUsable,
  dedupeAndSortByStrength,
  truncateToTop,
} from '../../utils/wifi';

describe('getSignalBars', () => {
  it('returns 8 bars for excellent signal (-50 or higher)', () => {
    expect(getSignalBars(-40)).toBe(8);
    expect(getSignalBars(-50)).toBe(8);
  });

  it('maps the spec thresholds to bar counts', () => {
    expect(getSignalBars(-55)).toBe(7);
    expect(getSignalBars(-65)).toBe(6);
    expect(getSignalBars(-75)).toBe(5);
    expect(getSignalBars(-85)).toBe(4);
    expect(getSignalBars(-95)).toBe(2);
  });

  it('returns 0 bars below the usable threshold', () => {
    expect(getSignalBars(-101)).toBe(0);
    expect(getSignalBars(-120)).toBe(0);
  });
});

describe('getSignalQuality', () => {
  it('returns 100 for -50 dBm', () => {
    expect(getSignalQuality(-50)).toBe(100);
  });

  it('returns 0 for -100 dBm', () => {
    expect(getSignalQuality(-100)).toBe(0);
  });

  it('clamps to the 0-100 range', () => {
    expect(getSignalQuality(-30)).toBe(100);
    expect(getSignalQuality(-150)).toBe(0);
  });
});

describe('clampRssi', () => {
  it('clamps values above 0', () => {
    expect(clampRssi(5)).toBe(0);
  });

  it('clamps values below -120', () => {
    expect(clampRssi(-200)).toBe(-120);
  });

  it('keeps in-range values unchanged', () => {
    expect(clampRssi(-65)).toBe(-65);
  });
});

describe('getFrequencyBand', () => {
  it('labels 2.4 GHz channels', () => {
    expect(getFrequencyBand(2437)).toBe('2.4 GHz');
  });

  it('labels 5 GHz channels', () => {
    expect(getFrequencyBand(5180)).toBe('5 GHz');
  });

  it('labels 6 GHz channels', () => {
    expect(getFrequencyBand(3600)).toBe('6 GHz');
  });
});

describe('isRssiUsable', () => {
  it('is usable at the -100 threshold', () => {
    expect(isRssiUsable(-100)).toBe(true);
    expect(isRssiUsable(-65)).toBe(true);
  });

  it('is not usable below -100', () => {
    expect(isRssiUsable(-101)).toBe(false);
  });
});

describe('dedupeAndSortByStrength', () => {
  const networks = [
    { bssid: 'A', rssi: -70 },
    { bssid: 'B', rssi: -50 },
    { bssid: 'A', rssi: -60 },
    { bssid: 'C', rssi: -90 },
  ];

  it('keeps only the strongest reading per BSSID', () => {
    const result = dedupeAndSortByStrength(networks);
    expect(result).toHaveLength(3);
    expect(result.find((n) => n.bssid === 'A')?.rssi).toBe(-60);
  });

  it('sorts strongest first', () => {
    const result = dedupeAndSortByStrength(networks);
    expect(result.map((n) => n.rssi)).toEqual([-50, -60, -90]);
  });
});

describe('truncateToTop', () => {
  it('truncates lists larger than the max', () => {
    const list = Array.from({ length: 100 }, (_, i) => ({ bssid: `${i}`, rssi: -i }));
    expect(truncateToTop(list, 50)).toHaveLength(50);
  });

  it('returns the original array when within the max', () => {
    const list = [{ bssid: 'A', rssi: -50 }];
    expect(truncateToTop(list, 50)).toBe(list);
  });
});
