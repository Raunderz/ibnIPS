// ICPS/app/_layout.tsx

import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '../utils/colors';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="tag" options={{ title: 'Tag Your Location', presentation: 'modal' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      <Stack.Screen name="wifi-debug" options={{ title: 'Wi-Fi Networks' }} />
    </Stack>
  );
}
