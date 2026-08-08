// ICPS/hooks/usePosition.ts

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Position, PositionStatus, FloorNumber } from '../types';
import { getNextPosition, getPositionFromScans } from '../services/positionService';
import { POSITION_UPDATE_INTERVAL_MS } from '../utils/constants';

interface UsePositionOptions {
  isMockMode: boolean;
  mockBasePosition?: Position;
  realScans?: Array<{ rssi: number }>;
  floor?: FloorNumber;
}

export function usePosition({
  isMockMode,
  mockBasePosition,
  realScans = [],
  floor = 0,
}: UsePositionOptions) {
  const [position, setPosition] = useState<Position | null>(null);
  const [status, setStatus] = useState<PositionStatus>('loading');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOnce = useCallback(async () => {
    try {
      if (isMockMode) {
        const next = await getNextPosition(isMockMode, mockBasePosition);
        setPosition(next);
        setStatus('active');
      } else {
        const next = getPositionFromScans(realScans, floor);
        if (next) {
          setPosition(next);
          setStatus('active');
        } else {
          throw new Error('No Wi-Fi signals detected');
        }
      }
    } catch {
      // Keep last known position (grayed out in UI), just flag the error state
      setStatus('error');
    }
  }, [isMockMode, mockBasePosition, realScans, floor]);

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

  // Real mode: recompute position whenever live Wi-Fi scans change.
  useEffect(() => {
    if (isMockMode) {
      return;
    }
    const next = getPositionFromScans(realScans, floor);
    if (next) {
      setPosition(next);
      setStatus('active');
    } else {
      setStatus('error');
    }
  }, [isMockMode, realScans, floor]);

  // Mock mode: poll on an interval and pause when backgrounded.
  useEffect(() => {
    if (!isMockMode) {
      return;
    }
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
  }, [isMockMode, startUpdates, stopUpdates]);

  return { position, status, refresh: fetchOnce };
}
