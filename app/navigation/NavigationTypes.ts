// ICPS/navigation/NavigationTypes.ts

export type RootStackParamList = {
  Map: { floor?: 1 | 2 | 3 } | undefined; 
  TagLocation: undefined;
  Debug: undefined;
  Onboarding: undefined;
};

export type ScreenName = keyof RootStackParamList;