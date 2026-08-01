// ICPS/App.tsx

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import RootNavigator from './navigation/RootNavigator';
import { getHasSeenOnboarding } from './services/storageService';
import { useThemeColors } from './utils/colors';
import { RootStackParamList } from './navigation/NavigationTypes';

export default function App() {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);
  const themeColors = useThemeColors();

  useEffect(() => {
    // Spec section 9.2 first-run flow: check onboarding flag before deciding
    // where to land the user. Permission prompts are handled natively on
    // first mount of the Onboarding/Map screens.
    (async () => {
      const hasSeenOnboarding = await getHasSeenOnboarding();
      setInitialRoute(hasSeenOnboarding ? 'Map' : 'Onboarding');
    })();
  }, []);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColors.background }}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  return <RootNavigator initialRouteName={initialRoute} />;
}