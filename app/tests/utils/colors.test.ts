// Test color constants and utility logic

interface ColorPalette {
  primary: string;
  secondary: string;
  danger: string;
  success: string;
  warning: string;
  background: string;
  text: string;
  muted: string;
}

const DEFAULT_COLORS: ColorPalette = {
  primary: '#3B82F6',
  secondary: '#6B7280',
  danger: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',
  background: '#FFFFFF',
  text: '#111827',
  muted: '#9CA3AF',
};

function isValidHex(color: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);
}

function withAlpha(hexColor: string, alpha: number): string {
  if (!isValidHex(hexColor)) return hexColor;
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function contrastRatio(hex1: string, hex2: string): number {
  function luminance(hex: string): number {
    const h = hex.replace('#', '');
    const [r, g, b] = [0, 2, 4].map((i) => {
      const val = parseInt(h.substring(i, i + 2), 16) / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  const l1 = luminance(hex1);
  const l2 = luminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('Colors Utility', () => {
  describe('DEFAULT_COLORS', () => {
    it('should have all required color keys', () => {
      const requiredKeys: (keyof ColorPalette)[] = [
        'primary', 'secondary', 'danger', 'success',
        'warning', 'background', 'text', 'muted',
      ];
      requiredKeys.forEach((key) => {
        expect(DEFAULT_COLORS).toHaveProperty(key);
      });
    });

    it('all colors should be valid hex', () => {
      Object.values(DEFAULT_COLORS).forEach((color) => {
        expect(isValidHex(color)).toBe(true);
      });
    });
  });

  describe('isValidHex', () => {
    it('should accept 6-digit hex', () => {
      expect(isValidHex('#FF5733')).toBe(true);
    });

    it('should accept 3-digit hex', () => {
      expect(isValidHex('#F00')).toBe(true);
    });

    it('should reject invalid hex', () => {
      expect(isValidHex('red')).toBe(false);
      expect(isValidHex('#GGGGGG')).toBe(false);
      expect(isValidHex('123456')).toBe(false);
    });
  });

  describe('withAlpha', () => {
    it('should add alpha to hex color', () => {
      const result = withAlpha('#FF0000', 0.5);
      expect(result).toBe('rgba(255, 0, 0, 0.5)');
    });

    it('should handle fully transparent', () => {
      const result = withAlpha('#000000', 0);
      expect(result).toBe('rgba(0, 0, 0, 0)');
    });

    it('should handle fully opaque', () => {
      const result = withAlpha('#FFFFFF', 1);
      expect(result).toBe('rgba(255, 255, 255, 1)');
    });

    it('should return original for invalid hex', () => {
      expect(withAlpha('not-a-color', 0.5)).toBe('not-a-color');
    });
  });

  describe('contrastRatio', () => {
    it('should return high ratio for black and white', () => {
      const ratio = contrastRatio('#000000', '#FFFFFF');
      expect(ratio).toBeCloseTo(21, 0);
    });

    it('should return 1 for same color', () => {
      const ratio = contrastRatio('#3B82F6', '#3B82F6');
      expect(ratio).toBeCloseTo(1, 1);
    });

    it('should be commutative', () => {
      const r1 = contrastRatio('#FF0000', '#00FF00');
      const r2 = contrastRatio('#00FF00', '#FF0000');
      expect(r1).toBeCloseTo(r2, 5);
    });
  });
});
