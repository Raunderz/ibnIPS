// ICPS/components/Toast.tsx

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useThemeColors, ThemeColors } from '../utils/colors';
import { spacing } from '../utils/spacing';
import { ToastMessage } from '../types';

interface ToastProps {
  toast: ToastMessage | null;
}

const variantIcons = {
  success: '✓',
  warning: '⚠',
  error: '✕',
};

export default function Toast({ toast }: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const themeColors = useThemeColors();
  const styles = getStyles(themeColors);

  const variantColors = {
    success: themeColors.primary === '#D0BCFF' ? '#388E3C' : '#2E7D32',
    warning: themeColors.warning,
    error: themeColors.error,
  };

  useEffect(() => {
    if (toast) {
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    } else {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }
  }, [toast, opacity]);

  if (!toast) return null;

  return (
    <Animated.View
      style={[styles.container, { backgroundColor: variantColors[toast.variant], opacity }]}
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.text}>
        {variantIcons[toast.variant]}  {toast.message}
      </Text>
    </Animated.View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 32,
    left: spacing.screenPaddingHorizontal,
    right: spacing.screenPaddingHorizontal,
    borderRadius: spacing.shapeSmall, // MD3 Snackbars use 4dp corners
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6, // MD3 SnackBar elevation
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});