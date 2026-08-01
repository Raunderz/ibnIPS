// Test constants utility

interface AppConstants {
  API_BASE_URL: string;
  API_TIMEOUT: number;
  MAX_FLOORS: number;
  MIN_RSSI_THRESHOLD: number;
  TOAST_DURATION: number;
  WIFI_SCAN_INTERVAL: number;
  CONFIDENCE_THRESHOLD: number;
}

const DEFAULT_CONSTANTS: AppConstants = {
  API_BASE_URL: 'http://localhost:3000',
  API_TIMEOUT: 10000,
  MAX_FLOORS: 3,
  MIN_RSSI_THRESHOLD: -80,
  TOAST_DURATION: 3000,
  WIFI_SCAN_INTERVAL: 2000,
  CONFIDENCE_THRESHOLD: 0.5,
};

function validateConstants(c: AppConstants): string[] {
  const errors: string[] = [];
  if (c.API_TIMEOUT <= 0) errors.push('API_TIMEOUT must be positive');
  if (c.MAX_FLOORS <= 0) errors.push('MAX_FLOORS must be positive');
  if (c.MIN_RSSI_THRESHOLD > 0) errors.push('MIN_RSSI_THRESHOLD must be negative');
  if (c.TOAST_DURATION <= 0) errors.push('TOAST_DURATION must be positive');
  if (c.WIFI_SCAN_INTERVAL <= 0) errors.push('WIFI_SCAN_INTERVAL must be positive');
  if (c.CONFIDENCE_THRESHOLD < 0 || c.CONFIDENCE_THRESHOLD > 1) {
    errors.push('CONFIDENCE_THRESHOLD must be between 0 and 1');
  }
  return errors;
}

describe('Constants Utility', () => {
  describe('DEFAULT_CONSTANTS', () => {
    it('should have valid API base URL', () => {
      expect(DEFAULT_CONSTANTS.API_BASE_URL).toMatch(/^https?:\/\//);
    });

    it('should have positive API timeout', () => {
      expect(DEFAULT_CONSTANTS.API_TIMEOUT).toBeGreaterThan(0);
    });

    it('should have MAX_FLOORS matching type definition (1, 2, 3)', () => {
      expect(DEFAULT_CONSTANTS.MAX_FLOORS).toBe(3);
    });

    it('should have negative MIN_RSSI_THRESHOLD', () => {
      expect(DEFAULT_CONSTANTS.MIN_RSSI_THRESHOLD).toBeLessThan(0);
    });

    it('should have positive TOAST_DURATION', () => {
      expect(DEFAULT_CONSTANTS.TOAST_DURATION).toBeGreaterThan(0);
    });

    it('should have valid CONFIDENCE_THRESHOLD', () => {
      expect(DEFAULT_CONSTANTS.CONFIDENCE_THRESHOLD).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_CONSTANTS.CONFIDENCE_THRESHOLD).toBeLessThanOrEqual(1);
    });
  });

  describe('validateConstants', () => {
    it('should return no errors for valid constants', () => {
      expect(validateConstants(DEFAULT_CONSTANTS)).toHaveLength(0);
    });

    it('should detect invalid API_TIMEOUT', () => {
      const errors = validateConstants({ ...DEFAULT_CONSTANTS, API_TIMEOUT: -1 });
      expect(errors).toContain('API_TIMEOUT must be positive');
    });

    it('should detect invalid CONFIDENCE_THRESHOLD', () => {
      const errors = validateConstants({ ...DEFAULT_CONSTANTS, CONFIDENCE_THRESHOLD: 1.5 });
      expect(errors.some((e) => e.includes('CONFIDENCE_THRESHOLD'))).toBe(true);
    });

    it('should detect positive MIN_RSSI_THRESHOLD', () => {
      const errors = validateConstants({ ...DEFAULT_CONSTANTS, MIN_RSSI_THRESHOLD: 10 });
      expect(errors).toContain('MIN_RSSI_THRESHOLD must be negative');
    });

    it('should collect multiple errors', () => {
      const errors = validateConstants({
        ...DEFAULT_CONSTANTS,
        API_TIMEOUT: -1,
        CONFIDENCE_THRESHOLD: -0.5,
      });
      expect(errors.length).toBeGreaterThanOrEqual(2);
    });
  });
});
