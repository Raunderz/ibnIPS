// ICPS/app/_layout.tsx

import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useThemeColors, loadAccentKey } from '../utils/colors';
import { loadMockModePrefs } from '../hooks/useMockMode';
import { ensureRoomsLoaded } from '../hooks/useRooms';

export default function RootLayout() {
  const themeColors = useThemeColors();

  useEffect(() => {
    loadAccentKey();
    loadMockModePrefs();
    ensureRoomsLoaded();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: themeColors.card },
        headerTintColor: themeColors.textPrimary,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="tag" options={{ title: 'Tag Your Location', presentation: 'modal' }} />
      <Stack.Screen name="route-preview" options={{ title: 'Route Preview' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      <Stack.Screen name="wifi-debug" options={{ title: 'Wi-Fi Networks' }} />
    </Stack>
  );
}
