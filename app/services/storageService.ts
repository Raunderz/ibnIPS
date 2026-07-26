// ICPS/services/storageService.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { HAS_SEEN_ONBOARDING_KEY } from '../utils/constants';

export async function getHasSeenOnboarding(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(HAS_SEEN_ONBOARDING_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function setHasSeenOnboarding(value: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(HAS_SEEN_ONBOARDING_KEY, value ? 'true' : 'false');
  } catch {
    // Non-fatal — onboarding may just show again next launch
  }
}

interface UserPreferences {
  floorDisplayAsName: boolean; // true = "Floor 1", false = "F1"
  pinAnimationEnabled: boolean;
}

const PREFS_KEY = 'userPreferences';

const DEFAULT_PREFERENCES: UserPreferences = {
  floorDisplayAsName: true,
  pinAnimationEnabled: true,
};

export async function getUserPreferences(): Promise<UserPreferences> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export async function setUserPreferences(prefs: Partial<UserPreferences>): Promise<void> {
  try {
    const current = await getUserPreferences();
    const updated = { ...current, ...prefs };
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(updated));
  } catch {
    // Non-fatal
  }
}

export async function resetAllData(): Promise<void> {
  try {
    await AsyncStorage.clear();
  } catch {
    // Non-fatal — user can retry from Debug screen
  }
}

export type { UserPreferences };