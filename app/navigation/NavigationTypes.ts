// app/navigation/NavigationTypes.ts

export type RootStackParamList = {
  Map: undefined;
  TagLocation: undefined;
  Debug: undefined;
  WifiDebug: undefined;
  Onboarding: undefined;
};

export type RouteKey = keyof RootStackParamList;