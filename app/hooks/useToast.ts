// ICPS/hooks/useToast.ts

import { useCallback, useRef, useState } from 'react';
import { ToastMessage, ToastVariant } from '../types';
import { TOAST_DURATION_MS } from '../utils/constants';

let idCounter = 0;

export function useToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, variant: ToastVariant = 'success') => {
    if (timerRef.current) clearTimeout(timerRef.current);

    idCounter += 1;
    setToast({ id: String(idCounter), message, variant });

    timerRef.current = setTimeout(() => {
      setToast(null);
    }, TOAST_DURATION_MS);
  }, []);

  const dismissToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  return { toast, showToast, dismissToast };
}