// ICPS/components/Button.tsx

import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../utils/colors';
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
        variantStyles[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={[styles.text, variant === 'secondary' && styles.textSecondary]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.buttonPaddingVertical,
    paddingHorizontal: spacing.buttonPaddingHorizontal * 1.5,
    borderRadius: spacing.borderRadiusStandard,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48, // WCAG touch target, spec 11.3
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  textSecondary: {
    color: colors.textPrimary,
  },
  disabled: {
    backgroundColor: colors.disabled,
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.primary },
  secondary: {
    backgroundColor: colors.secondaryButtonBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  danger: { backgroundColor: colors.error },
});