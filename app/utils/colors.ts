// ICPS/utils/colors.ts
// Source: Frontend Specification, section 5.1 Color Palette

export const colors = {
  primary: '#2563EB',       // Buttons, highlights, active states
  secondary: '#10B981',     // Success states, confirmations
  warning: '#F59E0B',       // Warnings, caution states
  error: '#EF4444',         // Errors, cancellations
  background: '#F9FAFB',    // Screen background
  card: '#FFFFFF',          // Cards, containers
  border: '#E5E7EB',        // Lines, dividers
  textPrimary: '#1F2937',   // Main text
  textSecondary: '#6B7280', // Helper text, labels
  disabled: '#D1D5DB',      // Disabled states
  secondaryButtonBg: '#F3F4F6',
} as const;

export type ColorKey = keyof typeof colors;