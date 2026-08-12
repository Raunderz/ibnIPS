// ICPS/services/storageService.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_TOKEN_KEY, HAS_SEEN_ONBOARDING_KEY, THEME_ACCENT_KEY } from '../utils/constants';

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

export async function getThemeAccent(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(THEME_ACCENT_KEY);
  } catch {
    return null;
  }
}

// Backend auth token (issued by POST /api/auth). Persisted so /api/ping can
// authenticate without re-prompting on every launch.
export async function getAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setAuthToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch {
    // Non-fatal — the app falls back to re-authenticating next launch.
  }
}

export async function clearAuthToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // Non-fatal
  }
}

export async function setThemeAccent(key: string): Promise<void> {
  try {
    await AsyncStorage.setItem(THEME_ACCENT_KEY, key);
  } catch {
    // Non-fatal — theme resets to default next launch
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