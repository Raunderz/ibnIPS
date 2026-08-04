// ICPS/screens/TagLocationScreen.tsx

import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import RoomSelector from '../components/RoomSelector';
import NetworkStatusList from '../components/NetworkStatusList';
import Button from '../components/Button';
import Toast from '../components/Toast';
import ErrorDialog from '../components/ErrorDialog';
import { useToast } from '../hooks/useToast';
import { useThemeColors, ThemeColors } from '../utils/colors';
import { spacing } from '../utils/spacing';
import { ROOMS, TAG_UPLOAD_TIMEOUT_MS } from '../utils/constants';
import { getMockScenario } from '../services/mockDataService';
import { Room, TagUploadStatus } from '../types';

export default function TagLocationScreen() {
  const router = useRouter();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [uploadStatus, setUploadStatus] = useState<TagUploadStatus>('idle');
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const { toast, showToast } = useToast();
  const themeColors = useThemeColors();
  const styles = getStyles(themeColors);

  // Mock live network readings — swap for apiClient.fetchVisibleNetworks in production
  const networks = getMockScenario('lab_201').networks;

  const handleConfirm = async () => {
    if (!selectedRoom) return;
    setUploadStatus('loading');

    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, 2500); // simulate 2-3s upload
        setTimeout(() => clearTimeout(timer), TAG_UPLOAD_TIMEOUT_MS);
      });
      setUploadStatus('success');
      showToast(`Tagged as ${selectedRoom.name} (Floor ${selectedRoom.floor})`, 'success');
      setTimeout(() => router.back(), 800);
    } catch {
      setUploadStatus('error');
      setShowErrorDialog(true);
    }
  };

  const canConfirm = !!selectedRoom && uploadStatus !== 'loading';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <RoomSelector rooms={ROOMS} selectedRoom={selectedRoom} onSelect={setSelectedRoom} />

        <View style={{ height: spacing.componentSpacingVertical * 2 }} />

        <NetworkStatusList networks={networks} />

        <View style={{ flex: 1 }} />

        <Button
          label="Confirm Tag"
          onPress={handleConfirm}
          variant="primary"
          disabled={!canConfirm}
          loading={uploadStatus === 'loading'}
        />
      </View>

      <ErrorDialog
        visible={showErrorDialog}
        message="Upload failed. Retry?"
        onRetry={() => {
          setShowErrorDialog(false);
          handleConfirm();
        }}
        onCancel={() => setShowErrorDialog(false)}
      />

      <Toast toast={toast} />
    </SafeAreaView>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.screenPaddingHorizontal,
  },
});