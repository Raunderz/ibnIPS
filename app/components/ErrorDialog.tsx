// ICPS/components/ErrorDialog.tsx

import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import Button from './Button';
import { useThemeColors, ThemeColors } from '../utils/colors';
import { spacing } from '../utils/spacing';

interface ErrorDialogProps {
  visible: boolean;
  title?: string;
  message: string;
  onRetry: () => void;
  onCancel: () => void;
}

export default function ErrorDialog({
  visible,
  title = 'Error',
  message,
  onRetry,
  onCancel,
}: ErrorDialogProps) {
  const themeColors = useThemeColors();
  const styles = getStyles(themeColors);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Button label="Cancel" onPress={onCancel} variant="secondary" />
            <View style={{ width: spacing.componentSpacingVertical }} />
            <Button label="Retry" onPress={onRetry} variant="primary" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: spacing.shapeLarge, // MD3 Dialog corner radius is 28dp or 16dp. Let's use shapeLarge (16dp)
    padding: 24,
    width: '100%',
    maxWidth: 320, // MD3 Standard Alert Dialog width
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '400',
    color: colors.onSurface,
    marginBottom: 16,
    letterSpacing: 0.1,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end', // Aligned on the bottom right in MD3
  },
});