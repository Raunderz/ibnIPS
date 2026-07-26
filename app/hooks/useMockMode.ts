// ICPS/hooks/useMockMode.ts

import { useCallback, useState } from 'react';
import { MockScenario, Position } from '../types';
import { getMockScenario } from '../services/mockDataService';

export function useMockMode() {
  // Defaults to ON: there's no real backend yet, so the app should be
  // usable out of the box for demos and screen development.
  const [isMockMode, setIsMockMode] = useState(true);
  const [activeScenario, setActiveScenario] = useState<MockScenario | null>(
    getMockScenario('ground')
  );

  const toggleMockMode = useCallback(() => {
    setIsMockMode((prev) => !prev);
  }, []);

  const injectScenario = useCallback((id: MockScenario['id']) => {
    const scenario = getMockScenario(id);
    setActiveScenario(scenario);
    return scenario;
  }, []);

  const getMockBasePosition = useCallback((): Position | undefined => {
    return activeScenario?.position;
  }, [activeScenario]);

  return {
    isMockMode,
    toggleMockMode,
    activeScenario,
    injectScenario,
    getMockBasePosition,
  };
}