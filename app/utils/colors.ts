// ICPS/utils/colors.ts
// Source: Frontend Specification, section 5.1 Color Palette
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
} as const;

export type ColorKey = keyof typeof colors;