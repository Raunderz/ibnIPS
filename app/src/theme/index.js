import { useColorScheme } from 'react-native'

const palette = {
  light: {
    background: '#F5F7FB',
    surface: '#FFFFFF',
    surfaceMuted: '#EDF1F7',
    surfaceInverse: '#0B1220',
    text: '#0B1220',
    textMuted: '#5C667A',
    textSubtle: '#8A93A6',
    textInverse: '#F8FAFC',
    border: '#DBE1EC',
    borderStrong: '#C3CBD9',
    primary: '#1D4ED8',
    primaryPressed: '#1A3FAE',
    primarySoft: '#E5EDFF',
    onPrimary: '#FFFFFF',
    accent: '#0D9488',
    accentSoft: '#D6F5F1',
    success: '#15803D',
    successSoft: '#DCFCE7',
    warning: '#B45309',
    warningSoft: '#FEF3C7',
    danger: '#B91C1C',
    dangerSoft: '#FEE2E2',
    mapBackground: '#F8FAFC',
    mapEdge: '#B6C0D2',
    mapNode: '#FFFFFF',
    mapNodeBorder: '#1D4ED8',
    mapRoute: '#1D4ED8',
    mapRouteHalo: '#93B4FF',
    mapLabel: '#0B1220',
    overlay: 'rgba(11, 18, 32, 0.45)',
  },
  dark: {
    background: '#080D18',
    surface: '#131B2C',
    surfaceMuted: '#1C2536',
    surfaceInverse: '#F8FAFC',
    text: '#F1F5F9',
    textMuted: '#9AA6BA',
    textSubtle: '#6B7688',
    textInverse: '#0B1220',
    border: '#26314A',
    borderStrong: '#35415C',
    primary: '#7BA9FF',
    primaryPressed: '#5D8FF0',
    primarySoft: '#1B2B4D',
    onPrimary: '#08101F',
    accent: '#2DD4BF',
    accentSoft: '#123A38',
    success: '#4ADE80',
    successSoft: '#12321F',
    warning: '#FBBF24',
    warningSoft: '#3A2E0C',
    danger: '#F87171',
    dangerSoft: '#3A1616',
    mapBackground: '#0D1424',
    mapEdge: '#3A4763',
    mapNode: '#1C2536',
    mapNodeBorder: '#7BA9FF',
    mapRoute: '#7BA9FF',
    mapRouteHalo: '#2A4272',
    mapLabel: '#E2E8F0',
    overlay: 'rgba(3, 7, 18, 0.6)',
  },
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
}

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
}

export const typography = {
  display: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  heading: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 15, fontWeight: '400' },
  bodyStrong: { fontSize: 15, fontWeight: '600' },
  caption: { fontSize: 13, fontWeight: '500' },
  micro: { fontSize: 11, fontWeight: '600', letterSpacing: 0.4 },
  mono: { fontSize: 13, fontWeight: '400' },
}

export function getTheme(scheme) {
  return scheme === 'dark' ? palette.dark : palette.light
}

export function useTheme() {
  const scheme = useColorScheme()
  return getTheme(scheme === 'dark' ? 'dark' : 'light')
}

export const themes = palette
