// ICPS/hooks/usePosition.ts

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Position, PositionStatus } from '../types';
import { getNextPosition } from '../services/positionService';
import { POSITION_UPDATE_INTERVAL_MS } from '../utils/constants';

interface UsePositionOptions {
  isMockMode: boolean;
  mockBasePosition?: Position;
}

export function usePosition({ isMockMode, mockBasePosition }: UsePositionOptions) {
  const [position, setPosition] = useState<Position | null>(null);
  const [status, setStatus] = useState<PositionStatus>('loading');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOnce = useCallback(async () => {
    try {
      const next = await getNextPosition(isMockMode, mockBasePosition);
      setPosition(next);
      setStatus('active');
    } catch {
      // Keep last known position (grayed out in UI), just flag the error state
      setStatus('error');
    }
  }, [isMockMode, mockBasePosition]);

  const startUpdates = useCallback(() => {
    if (intervalRef.current) return;
    fetchOnce();
    intervalRef.current = setInterval(fetchOnce, POSITION_UPDATE_INTERVAL_MS);
  }, [fetchOnce]);

  const stopUpdates = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Pause when backgrounded, resume when foregrounded (spec 12.1)
  useEffect(() => {
    startUpdates();

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        startUpdates();
      } else {
        stopUpdates();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      stopUpdates();
      subscription.remove();
    };
  }, [startUpdates, stopUpdates]);

  return { position, status, refresh: fetchOnce };
}