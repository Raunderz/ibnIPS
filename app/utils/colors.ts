// ICPS/utils/colors.ts
import { useColorScheme } from 'react-native';
import { useSyncExternalStore } from 'react';
import { getThemeAccent, setThemeAccent } from '../services/storageService';

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
  blue: '#0061A4',
  green: '#2E7D32',
  cyan: '#00849E',
  indigo: '#3949AB',
  red: '#B3261E',
  amber: '#B26A00',
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
  blue: '#90CAF9',
  green: '#A5D6A7',
  cyan: '#80DEEA',
  indigo: '#9FA8DA',
  red: '#F2B8B5',
  amber: '#FFD54F',
} as const;

// Default exported colors for static usage
export const colors = lightColors;

// Material 3 floor theme colors (dynamic primary accents)
export const floorColors: string[] = [colors.teal, colors.primary, colors.purple, colors.orange];
export const darkFloorColors: string[] = [darkColors.teal, darkColors.primary, darkColors.purple, darkColors.orange];

export type ThemeColors = { [K in keyof typeof lightColors]: string };
export type ColorKey = keyof ThemeColors;

// ---------------------------------------------------------------------------
// Interactive theme accent — the selected accent color drives `primary` across
// the app. Tapping a swatch on the Settings page changes the whole theme.
// ---------------------------------------------------------------------------

export const ACCENT_KEYS = [
  'purple',
  'pink',
  'teal',
  'orange',
  'blue',
  'green',
  'cyan',
  'indigo',
  'red',
  'amber',
] as const;

export type AccentKey = (typeof ACCENT_KEYS)[number];

export function isAccentKey(value: string): value is AccentKey {
  return (ACCENT_KEYS as readonly string[]).includes(value);
}

let accentKey: AccentKey = 'purple';
const accentListeners = new Set<() => void>();

function emitAccent() {
  accentListeners.forEach((listener) => listener());
}

function subscribeAccent(listener: () => void): () => void {
  accentListeners.add(listener);
  return () => {
    accentListeners.delete(listener);
  };
}

function getAccentSnapshot(): AccentKey {
  return accentKey;
}

export function getAccentKey(): AccentKey {
  return accentKey;
}

export function useAccentKey(): AccentKey {
  return useSyncExternalStore(subscribeAccent, getAccentSnapshot);
}

export function setAccentKey(key: AccentKey) {
  if (accentKey === key) return;
  accentKey = key;
  emitAccent();
  void setThemeAccent(key);
}

export async function loadAccentKey(): Promise<void> {
  const stored = await getThemeAccent();
  if (stored && isAccentKey(stored) && stored !== accentKey) {
    accentKey = stored;
    emitAccent();
  }
}

function relativeLuminance(hex: string): number {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(h.substring(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastingOnColor(hex: string): string {
  return relativeLuminance(hex) > 0.5 ? '#1D1B20' : '#FFFFFF';
}

export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme();
  const accent = useAccentKey();
  const base = scheme === 'dark' ? darkColors : lightColors;
  const accentHex = scheme === 'dark' ? darkColors[accent] : lightColors[accent];
  return {
    ...base,
    primary: accentHex,
    onPrimary: contrastingOnColor(accentHex),
  };
}

export function useFloorColors() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkFloorColors : floorColors;
}