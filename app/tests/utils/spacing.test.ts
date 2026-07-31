// Test spacing utility

interface Spacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

interface FontSize {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  title: number;
}

const DEFAULT_SPACING: Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

const DEFAULT_FONT_SIZES: FontSize = {
  xs: 10,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  title: 36,
};

function spacing倍(factor: number): number {
  return DEFAULT_SPACING.md * factor;
}

function isAscending(sizes: number[]): boolean {
  for (let i = 1; i < sizes.length; i++) {
    if (sizes[i] <= sizes[i - 1]) return false;
  }
  return true;
}

describe('Spacing Utility', () => {
  describe('DEFAULT_SPACING', () => {
    it('should have all spacing levels', () => {
      const keys: (keyof Spacing)[] = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];
      keys.forEach((key) => {
        expect(DEFAULT_SPACING).toHaveProperty(key);
        expect(typeof DEFAULT_SPACING[key]).toBe('number');
      });
    });

    it('should be in ascending order', () => {
      const values = Object.values(DEFAULT_SPACING);
      expect(isAscending(values)).toBe(true);
    });

    it('md should be 16 (standard base unit)', () => {
      expect(DEFAULT_SPACING.md).toBe(16);
    });
  });

  describe('spacing倍', () => {
    it('should return md * factor', () => {
      expect(spacing倍(2)).toBe(32);
      expect(spacing倍(0.5)).toBe(8);
    });

    it('should return md for factor 1', () => {
      expect(spacing倍(1)).toBe(DEFAULT_SPACING.md);
    });
  });

  describe('DEFAULT_FONT_SIZES', () => {
    it('should have all font size levels', () => {
      const keys: (keyof FontSize)[] = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'title'];
      keys.forEach((key) => {
        expect(DEFAULT_FONT_SIZES).toHaveProperty(key);
      });
    });

    it('should be in ascending order', () => {
      const values = Object.values(DEFAULT_FONT_SIZES);
      expect(isAscending(values)).toBe(true);
    });

    it('md should be 16 (standard body text)', () => {
      expect(DEFAULT_FONT_SIZES.md).toBe(16);
    });
  });
});
