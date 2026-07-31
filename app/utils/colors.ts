// ICPS/utils/colors.ts

export const colors = {
  primary: '#2563EB',
  secondary: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  background: '#F9FAFB',
  card: '#FFFFFF',
  border: '#E5E7EB',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  disabled: '#D1D5DB',
  secondaryButtonBg: '#F3F4F6',

  // Vivid accents for a more colorful UI
  purple: '#8B5CF6',
  pink: '#EC4899',
  teal: '#06B6D4',
  orange: '#F97316',
} as const;

// One vivid color per floor, indexed by floor number (0=Ground..3=3rd)
export const floorColors: string[] = [colors.teal, colors.primary, colors.purple, colors.pink];

export type ColorKey = keyof typeof colors;