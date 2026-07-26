// ICPS/navigation/NavigationTypes.ts

export type RootStackParamList = {
  Map: { floor?: 1 | 2 | 3 } | undefined; // supports deep link icps://map?floor=2
  TagLocation: undefined;
  Debug: undefined;
  Onboarding: undefined;
};

export type ScreenName = keyof RootStackParamList;