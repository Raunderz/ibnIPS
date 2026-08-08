// ICPS/hooks/useMockMode.ts
// Shared mock-mode state. Screens unmount/remount during navigation, so the
// store lives at module scope and is subscribed via useSyncExternalStore. The
// current mode and scenario persist across launches via AsyncStorage.

import { useCallback, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MockScenario, Position } from '../types';
import { getMockScenario } from '../services/mockDataService';
import { MOCK_MODE_KEY } from '../utils/constants';

let isMockMode = true;
let activeScenario: MockScenario | null = getMockScenario('ground');
let prefsLoaded = false;
const listeners = new Set<() => void>();
let lastSnapshot: { isMockMode: boolean; activeScenario: MockScenario | null } | null = null;

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function snapshot() {
  const current = { isMockMode, activeScenario };
  if (lastSnapshot &&
      lastSnapshot.isMockMode === current.isMockMode &&
      lastSnapshot.activeScenario === current.activeScenario) {
    return lastSnapshot;
  }
  lastSnapshot = current;
  return current;
}

async function persist() {
  try {
    await AsyncStorage.setItem(
      MOCK_MODE_KEY,
      JSON.stringify({ isMockMode, activeScenarioId: activeScenario?.id ?? null })
    );
  } catch {
    // Non-fatal — the setting just won't survive a restart.
  }
}

export async function loadMockModePrefs(): Promise<void> {
  if (prefsLoaded) return;
  prefsLoaded = true;
  try {
    const raw = await AsyncStorage.getItem(MOCK_MODE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { isMockMode?: unknown; activeScenarioId?: unknown };
    if (typeof parsed.isMockMode === 'boolean') {
      isMockMode = parsed.isMockMode;
    }
    if (typeof parsed.activeScenarioId === 'string') {
      const scenario = getMockScenario(parsed.activeScenarioId as MockScenario['id']);
      if (scenario) activeScenario = scenario;
    }
    emit();
  } catch {
    // Non-fatal — fall back to defaults.
  }
}

export function getMockModeState() {
  return { isMockMode, activeScenario };
}

export function toggleMockMode() {
  isMockMode = !isMockMode;
  emit();
  void persist();
}

export function injectScenario(id: MockScenario['id']) {
  const scenario = getMockScenario(id);
  activeScenario = scenario;
  emit();
  void persist();
  return scenario;
}

export function getMockBasePosition(): Position | undefined {
  return activeScenario?.position;
}

export function useMockMode() {
  const state = useSyncExternalStore(subscribe, snapshot);

  const toggle = useCallback(() => {
    toggleMockMode();
  }, []);

  const inject = useCallback((id: MockScenario['id']) => {
    return injectScenario(id);
  }, []);

  const getBase = useCallback((): Position | undefined => {
    return getMockBasePosition();
  }, []);

  return {
    isMockMode: state.isMockMode,
    activeScenario: state.activeScenario,
    toggleMockMode: toggle,
    injectScenario: inject,
    getMockBasePosition: getBase,
  };
}
