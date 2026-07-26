// ICPS/hooks/useMockMode.ts

import { useCallback, useState } from 'react';
import { MockScenario, Position } from '../types';
import { getMockScenario } from '../services/mockDataService';

export function useMockMode() {
  const [isMockMode, setIsMockMode] = useState(false);
  const [activeScenario, setActiveScenario] = useState<MockScenario | null>(null);

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