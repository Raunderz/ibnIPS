// ICPS/components/Button.tsx

import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { useThemeColors, ThemeColors } from '../utils/colors';
import { spacing } from '../utils/spacing';
import { ButtonVariant } from '../types';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
}

export default function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
}: ButtonProps) {
  const themeColors = useThemeColors();
  const styles = getStyles(themeColors);
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled }}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? themeColors.onSecondaryContainer : '#FFFFFF'} />
      ) : (
        <Text
          style={[
            styles.text,
            variant === 'secondary' && styles.textSecondary,
            variant === 'primary' && { color: themeColors.onPrimary },
            variant === 'danger' && { color: themeColors.onError },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  base: {
    paddingVertical: spacing.buttonPaddingVertical - 2,
    paddingHorizontal: spacing.buttonPaddingHorizontal * 1.5,
    borderRadius: spacing.shapeFull, // MD3 Pill shape
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48, // WCAG touch target, spec 11.3
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2, // Material 3 subtle elevation
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  textSecondary: {
    color: colors.onSecondaryContainer,
  },
  disabled: {
    backgroundColor: colors.disabled,
    opacity: 0.38, // MD3 disabled state opacity
    elevation: 0,
    shadowOpacity: 0,
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.98 }],
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.secondaryContainer,
    borderWidth: 0,
    elevation: 1,
  },
  danger: {
    backgroundColor: colors.error,
  },
});