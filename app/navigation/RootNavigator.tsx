// app/navigation/RootNavigator.tsx

import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { storageService } from '../services/storageService';
import { RootStackParamList } from './NavigationTypes';
import { MapScreen } from '../screens/MapScreen';
import { TagLocationScreen } from '../screens/TagLocationScreen';
import { DebugScreen } from '../screens/DebugScreen';
import { WifiDebugScreen } from '../screens/WifiDebugScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { colors } from '../utils/colors';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    const seen = await storageService.getHasSeenOnboarding();
    setHasSeenOnboarding(seen);
  };

  if (hasSeenOnboarding === null) {
    return null; // Loading state
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: '#FFF',
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
        },
        headerBackTitle: 'Back',
        animationEnabled: true,
      }}
    >
      {hasSeenOnboarding ? (
        <>
          <Stack.Screen
            name="Map"
            component={MapScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="TagLocation"
            component={TagLocationScreen}
            options={{
              title: 'Tag Location',
            }}
          />
          <Stack.Screen
            name="Debug"
            component={DebugScreen}
            options={{
              title: 'Debug Menu',
            }}
          />
          <Stack.Screen
            name="WifiDebug"
            component={WifiDebugScreen}
            options={{
              title: 'Wi-Fi Networks',
            }}
          />
        </>
      ) : (
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{
            headerShown: false,
            animationEnabled: false,
          }}
        />
      )}
    </Stack.Navigator>
  );
};