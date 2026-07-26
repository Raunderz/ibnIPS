// ICPS/components/ErrorDialog.tsx

import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import Button from './Button';
import { colors } from '../utils/colors';
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
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Button label="Retry" onPress={onRetry} variant="primary" />
            <View style={{ width: spacing.componentSpacingVertical }} />
            <Button label="Cancel" onPress={onCancel} variant="secondary" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.screenPaddingHorizontal,
  },
  dialog: {
    backgroundColor: colors.card,
    borderRadius: spacing.borderRadiusStandard,
    padding: spacing.cardPadding,
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
  },
});