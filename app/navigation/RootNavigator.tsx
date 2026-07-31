// ICPS/navigation/RootNavigator.tsx

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './NavigationTypes';
import MapScreen from '../screens/MapScreen';
import TagLocationScreen from '../screens/TagLocationScreen';
import DebugScreen from '../screens/DebugScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import { colors } from '../utils/colors';

const Stack = createNativeStackNavigator<RootStackParamList>();

interface RootNavigatorProps {
  initialRouteName: keyof RootStackParamList;
}

export default function RootNavigator({ initialRouteName }: RootNavigatorProps) {
  return (
    <NavigationContainer
      linking={{
        prefixes: ['icps://'],
        config: {
          screens: {
            Map: 'map',
            TagLocation: 'tag',
            Debug: 'settings',
          },
        },
      }}
    >
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.textPrimary,
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Map" component={MapScreen} options={{ headerShown: false }} />
        <Stack.Screen
          name="TagLocation"
          component={TagLocationScreen}
          options={{ title: 'Tag Your Location', presentation: 'modal' }}
        />
        <Stack.Screen name="Debug" component={DebugScreen} options={{ title: 'Settings' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}