import { useEffect, useRef, useCallback } from 'react';

export const useInactivityTimer = (timeoutSeconds, onInactive, enabled = true) => {
  const timerRef = useRef(null);
  const onInactiveRef = useRef(onInactive);

  useEffect(() => {
    onInactiveRef.current = onInactive;
  }, [onInactive]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!enabled) return;

    timerRef.current = setTimeout(() => {
      if (onInactiveRef.current) {
        onInactiveRef.current();
      }
    }, timeoutSeconds * 1000);
  }, [timeoutSeconds, enabled]);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const events = ['touchstart', 'touchmove', 'click', 'mousemove', 'keydown', 'scroll'];
    const handleActivity = () => resetTimer();

    events.forEach((evt) => window.addEventListener(evt, handleActivity, { passive: true }));
    resetTimer();

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleActivity));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, resetTimer]);

  return { resetTimer };
};
