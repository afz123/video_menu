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
    let hasCoords = false;

    const handleActivity = (e) => {
      if (e && e.type === 'mousemove') {
        const clientX = e.clientX || 0;
        const clientY = e.clientY || 0;

        // Ignore sensor hover noise when no buttons are pressed on outdoor kiosk displays
        if (e.pointerType === 'mouse' && e.buttons === 0) {
          return;
        }

        if (!hasCoords) {
          lastCoords = { x: clientX, y: clientY };
          hasCoords = true;
          return;
        }

        // Euclidean distance filtering against raindrops and electromagnetic noise
        const distance = Math.hypot(clientX - lastCoords.x, clientY - lastCoords.y);
        lastCoords = { x: clientX, y: clientY }; // Always update to prevent slow drift accumulation
        if (distance < 20) return;
      }
      resetTimer();
    };

    const handleTestTimeout = () => {
      if (onInactiveRef.current) {
        onInactiveRef.current();
      }
    };

    const events = ['touchstart', 'click', 'keydown', 'mousemove'];
    events.forEach((evt) => window.addEventListener(evt, handleActivity, { passive: true }));
    window.addEventListener('test-inactivity-timeout', handleTestTimeout);

    return () => {
      clearInterval(interval);
      events.forEach((evt) => window.removeEventListener(evt, handleActivity));
      window.removeEventListener('test-inactivity-timeout', handleTestTimeout);
    };
  }, [enabled, timeoutSeconds, warningSeconds, resetTimer]);

  return { resetTimer, secondsRemaining, isWarning };
};
