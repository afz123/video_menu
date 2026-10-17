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

    const events = ['touchstart', 'touchmove', 'click', 'mousemove', 'keydown', 'scroll'];
    const handleActivity = () => resetTimer();

    events.forEach((evt) => window.addEventListener(evt, handleActivity, { passive: true }));

    return () => {
      clearInterval(interval);
      events.forEach((evt) => window.removeEventListener(evt, handleActivity));
    };
  }, [enabled, timeoutSeconds, warningSeconds, resetTimer]);

  return { resetTimer, secondsRemaining, isWarning };
};
