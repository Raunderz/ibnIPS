// ICPS/components/Toast.tsx

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { colors } from '../utils/colors';
import { spacing } from '../utils/spacing';
import { ToastMessage } from '../types';

interface ToastProps {
  toast: ToastMessage | null;
}

const variantColors = {
  success: colors.secondary,
  warning: colors.warning,
  error: colors.error,
};

const variantIcons = {
  success: '✓',
  warning: '⚠',
  error: '✕',
};

export default function Toast({ toast }: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;

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
        {variantIcons[toast.variant]} {toast.message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    left: spacing.screenPaddingHorizontal,
    right: spacing.screenPaddingHorizontal,
    borderRadius: spacing.borderRadiusStandard,
    padding: spacing.cardPadding,
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});