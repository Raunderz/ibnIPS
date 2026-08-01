// ICPS/utils/colors.ts
import { useColorScheme } from 'react-native';

export const lightColors = {
  // Core Material 3 Roles
  primary: '#6750A4', // MD3 Purple Primary
  onPrimary: '#FFFFFF',
  primaryContainer: '#EADDFF',
  onPrimaryContainer: '#21005D',

  secondary: '#625B71', // MD3 Secondary
  onSecondary: '#FFFFFF',
  secondaryContainer: '#E8DEF8',
  onSecondaryContainer: '#1D192B',

  tertiary: '#7D5260',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#FFD8E4',
  onTertiaryContainer: '#31111D',

  background: '#FEF7FF',
  onBackground: '#1D1B20',

  surface: '#FEF7FF',
  onSurface: '#1D1B20',
  surfaceVariant: '#E7E0EC',
  onSurfaceVariant: '#49454F',
  surfaceContainerLow: '#F7F2FA',
  surfaceContainer: '#F3EDF7',
  surfaceContainerHigh: '#ECE6F0',

  outline: '#79747E',
  outlineVariant: '#CAC4D0',

  error: '#B3261E',
  onError: '#FFFFFF',
  errorContainer: '#F9DEDC',
  onErrorContainer: '#410E0B',

  warning: '#E65100',

  // Backward compatibility keys
  card: '#F7F2FA', // Maps to Surface Container Low
  border: '#CAC4D0', // Maps to OutlineVariant
  textPrimary: '#1D1B20', // Maps to On Surface
  textSecondary: '#49454F', // Maps to On Surface Variant
  disabled: '#E3E1E6',
  secondaryButtonBg: '#E8DEF8', // Maps to Secondary Container

  // Vivid accents matching MD3 tones for a more colorful UI
  purple: '#9C27B0',
  pink: '#984061',
  teal: '#006A6A',
  orange: '#8B5000',
} as const;

export const darkColors = {
  // Core Material 3 Roles
  primary: '#D0BCFF', // MD3 Purple Primary (Dark)
  onPrimary: '#381E72',
  primaryContainer: '#4F378B',
  onPrimaryContainer: '#EADDFF',

  secondary: '#CCC2DC', // MD3 Secondary (Dark)
  onSecondary: '#332D41',
  secondaryContainer: '#4A4458',
  onSecondaryContainer: '#E8DEF8',

  tertiary: '#EFB8C8',
  onTertiary: '#492532',
  tertiaryContainer: '#633B48',
  onTertiaryContainer: '#FFD8E4',

  background: '#141218',
  onBackground: '#E6E1E9',

  surface: '#141218',
  onSurface: '#E6E1E9',
  surfaceVariant: '#49454F',
  onSurfaceVariant: '#CAC4D0',
  surfaceContainerLow: '#1D1B20',
  surfaceContainer: '#211F26',
  surfaceContainerHigh: '#2B2930',

  outline: '#938F99',
  outlineVariant: '#49454F',

  error: '#F2B8B5',
  onError: '#601410',
  errorContainer: '#8C1D18',
  onErrorContainer: '#F9DEDC',

  warning: '#FFB300',

  // Backward compatibility keys
  card: '#1D1B20', // Maps to Surface Container Low
  border: '#49454F', // Maps to OutlineVariant
  textPrimary: '#E6E1E9', // Maps to On Surface
  textSecondary: '#CAC4D0', // Maps to On Surface Variant
  disabled: '#3B383E',
  secondaryButtonBg: '#4A4458', // Maps to Secondary Container

  // Vivid accents matching MD3 tones for a more colorful UI
  purple: '#CE93D8',
  pink: '#EFB8C8',
  teal: '#80E2E2',
  orange: '#FFB300',
} as const;

// Default exported colors for static usage
export const colors = lightColors;

// Material 3 floor theme colors (dynamic primary accents)
export const floorColors: string[] = [colors.teal, colors.primary, colors.purple, colors.orange];
export const darkFloorColors: string[] = [darkColors.teal, darkColors.primary, darkColors.purple, darkColors.orange];

export function useThemeColors() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkColors : lightColors;
}

export function useFloorColors() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkFloorColors : floorColors;
}

export type ThemeColors = { [K in keyof typeof lightColors]: string };
export type ColorKey = keyof ThemeColors;