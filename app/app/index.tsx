// ICPS/app/index.tsx

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import MapScreen from '../screens/MapScreen';
import { getHasSeenOnboarding } from '../services/storageService';
import { useThemeColors } from '../utils/colors';

export default function IndexRoute() {
  const themeColors = useThemeColors();
  const [ready, setReady] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  useEffect(() => {
    // Spec section 9.2 first-run flow: check onboarding flag before showing the
    // Map. The flag is re-read on every mount so finishing onboarding lands here.
    (async () => {
      const seen = await getHasSeenOnboarding();
      setHasSeenOnboarding(seen);
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColors.background }}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  if (!hasSeenOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  return <MapScreen />;
}
