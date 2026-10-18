import { useState, useEffect, useRef, useCallback } from 'react';

export const useInactivityTimer = (timeoutSeconds, onInactive, enabled = true, warningSeconds = 10) => {
  const [secondsRemaining, setSecondsRemaining] = useState(timeoutSeconds);
  const [isWarning, setIsWarning] = useState(false);

  const lastActivityRef = useRef(Date.now());
  const onInactiveRef = useRef(onInactive);

  useEffect(() => {
    onInactiveRef.current = onInactive;
  }, [onInactive]);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setSecondsRemaining(timeoutSeconds);
    setIsWarning(false);
  }, [timeoutSeconds]);

  useEffect(() => {
    if (!enabled) {
      setIsWarning(false);
      return;
    }

    lastActivityRef.current = Date.now();
    setSecondsRemaining(timeoutSeconds);
    setIsWarning(false);

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      const remaining = Math.max(0, timeoutSeconds - elapsed);
      setSecondsRemaining(remaining);

      if (remaining <= warningSeconds && remaining > 0) {
        setIsWarning(true);
      } else if (remaining === 0) {
        setIsWarning(false);
        if (onInactiveRef.current) {
          onInactiveRef.current();
        }
      }
    }, 1000);

    let lastCoords = { x: 0, y: 0 };

    const handleActivity = (e) => {
      if (e && e.type === 'mousemove') {
        // Ignore minor cursor jitter under 15px (weather/electromagnetic noise on outdoor kiosk glass)
        const deltaX = Math.abs((e.clientX || 0) - lastCoords.x);
        const deltaY = Math.abs((e.clientY || 0) - lastCoords.y);
        if (deltaX < 15 && deltaY < 15) return;
        lastCoords = { x: e.clientX || 0, y: e.clientY || 0 };
      }
      resetTimer();
    };

    const events = ['touchstart', 'click', 'keydown', 'mousemove'];
    events.forEach((evt) => window.addEventListener(evt, handleActivity, { passive: true }));

    return () => {
      clearInterval(interval);
      events.forEach((evt) => window.removeEventListener(evt, handleActivity));
    };
  }, [enabled, timeoutSeconds, warningSeconds, resetTimer]);

  return { resetTimer, secondsRemaining, isWarning };
};
