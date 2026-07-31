// ICPS/utils/spacing.ts
// Source: Frontend Specification, section 5.3 Spacing

export const spacing = {
  screenPaddingHorizontal: 16,
  componentSpacingVertical: 12,
  cardPadding: 16,
  buttonPaddingVertical: 12,
  buttonPaddingHorizontal: 16,
  borderRadiusStandard: 12, // Updated to MD3 shapeMedium
  borderRadiusSmall: 4,

  // Material 3 Shapes
  shapeNone: 0,
  shapeSmall: 4,
  shapeMedium: 12,
  shapeLarge: 16,
  shapeExtraLarge: 28,
  shapeFull: 999,

  elevationBlur: 4,
  elevationOpacity: 0.1,
} as const;


// Typography scale — section 5.2
export const typography = {
  screenTitle: { fontSize: 28, fontWeight: '700' as const, lineHeight: 28 * 1.2 },
  sectionHeader: { fontSize: 18, fontWeight: '600' as const, lineHeight: 18 * 1.3 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 16 * 1.5 },
  label: { fontSize: 14, fontWeight: '500' as const, lineHeight: 14 * 1.4 },
  small: { fontSize: 12, fontWeight: '400' as const, lineHeight: 12 * 1.3 },
  fontFamily: 'Roboto',
};

// Animation durations — section 5.5
export const animations = {
  pinUpdateMs: 500,
  floorChangeMs: 200,
  buttonPressMs: 100,
  toastDismissMs: 300,
  spinnerLoopMs: 1000,
};