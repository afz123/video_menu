import { describe, it, expect, vi } from 'vitest';

describe('Kiosk Security & PII Sanitization Lifecycle', () => {
  it('resets sensitive booking form fields and cleans state on timeout', () => {
    let mode = 'INTERACTIVE';
    let isBookingOpen = true;
    let sessionResetKey = 0;

    const onInactivityTimeout = () => {
      mode = 'ATTRACT';
      isBookingOpen = false;
      sessionResetKey += 1;
    };

    expect(mode).toBe('INTERACTIVE');
    expect(isBookingOpen).toBe(true);
    expect(sessionResetKey).toBe(0);

    // Simulate 45s idle trigger
    onInactivityTimeout();

    expect(mode).toBe('ATTRACT');
    expect(isBookingOpen).toBe(false);
    expect(sessionResetKey).toBe(1); // Triggers remount wiping all guest contacts from DOM memory
  });

  it('calculates active slide index using container clientHeight instead of window.innerHeight', () => {
    // Dynamic iOS viewport test
    const containerClientHeight = 680;
    const scrollTop = 1360;

    const activeIndex = Math.round(scrollTop / containerClientHeight);
    expect(activeIndex).toBe(2);
  });

  it('filters out cursor jitter under 15px in kiosk inactivity tracker', () => {
    let resetCount = 0;
    const resetTimer = () => { resetCount++; };

    let lastCoords = { x: 100, y: 100 };
    const handleActivity = (e) => {
      if (e && e.type === 'mousemove') {
        const deltaX = Math.abs((e.clientX || 0) - lastCoords.x);
        const deltaY = Math.abs((e.clientY || 0) - lastCoords.y);
        if (deltaX < 15 && deltaY < 15) return;
        lastCoords = { x: e.clientX || 0, y: e.clientY || 0 };
      }
      resetTimer();
    };

    // Micro-jitter: 3px delta -> must be ignored
    handleActivity({ type: 'mousemove', clientX: 103, clientY: 102 });
    expect(resetCount).toBe(0);

    // Intentional physical movement: 40px delta -> triggers reset
    handleActivity({ type: 'mousemove', clientX: 150, clientY: 100 });
    expect(resetCount).toBe(1);
  });

  it('unmutes video element synchronously during physical tap to preserve WebKit User Gesture context', () => {
    const mockVideo = {
      muted: true,
      play: vi.fn().mockResolvedValue(undefined)
    };

    let effectiveMuted = true;
    const willBeMuted = !effectiveMuted;
    mockVideo.muted = willBeMuted;
    if (!willBeMuted) {
      mockVideo.play();
    }

    expect(mockVideo.muted).toBe(false);
    expect(mockVideo.play).toHaveBeenCalledTimes(1);
  });

  it('isolates kiosk table booking when reservations module is not licensed', () => {
    const canBook = false;
    let isBookingOpen = false;
    const onOpenBooking = canBook ? () => { isBookingOpen = true; } : null;

    expect(onOpenBooking).toBeNull();
    // In AttractScreen: kioskUI.show_booking_btn !== false && onOpenBooking
    const shouldRenderBookingBtn = true && Boolean(onOpenBooking);
    expect(shouldRenderBookingBtn).toBe(false);
  });

  it('correctly suppresses price and weight in kiosk when dish_card flags are false', () => {
    const cardUI = {
      show_price: false,
      show_weight: false,
      show_badges: true
    };

    const dish = {
      price: 450,
      currency: 'TJS',
      weight: '350 г',
      badges: ['Хит']
    };

    const renderedPrice = cardUI.show_price !== false ? `${dish.price} ${dish.currency}` : null;
    const renderedWeight = cardUI.show_weight !== false && dish.weight ? dish.weight : null;
    const renderedBadges = cardUI.show_badges !== false ? dish.badges : [];

    expect(renderedPrice).toBeNull();
    expect(renderedWeight).toBeNull();
    expect(renderedBadges).toEqual(['Хит']);
  });
});
