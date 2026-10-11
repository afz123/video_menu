import { useEffect, useRef } from 'react';

export const useInactivityTimer = (timeoutSeconds, onInactive, enabled = true) => {
  const timerRef = useRef(null);

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!enabled) return;

    timerRef.current = setTimeout(() => {
      if (onInactive) onInactive();
    }, timeoutSeconds * 1000);
  };

  useEffect(() => {
    if (!enabled) return;

    const events = ['touchstart', 'touchmove', 'click', 'mousemove', 'keydown', 'scroll'];
    const handleActivity = () => resetTimer();

    events.forEach((evt) => window.addEventListener(evt, handleActivity, { passive: true }));
    resetTimer();

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleActivity));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeoutSeconds, enabled, onInactive]);

  return { resetTimer };
};
