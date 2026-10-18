import React, { useState, useEffect } from 'react';
import { AttractScreen } from './AttractScreen';
import { InteractiveMenu } from './InteractiveMenu';
import { QrBridgeModal } from './QrBridgeModal';
import { BookingModal } from './BookingModal';
import { useInactivityTimer } from '../../hooks/useInactivityTimer';

export const KioskContainer = ({ restaurantData }) => {
  const [mode, setMode] = useState('ATTRACT'); // 'ATTRACT' | 'INTERACTIVE'
  const [isQrBridgeOpen, setIsQrBridgeOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [sessionResetKey, setSessionResetKey] = useState(0);

  const theme = restaurantData.theme || {};
  const kioskSettings = theme.kiosk_settings || {};
  const inactivitySeconds = kioskSettings.inactivity_seconds || 45;

  // Auto-reset back to Attract screen when idle with 10s countdown warning and sanitization
  const { resetTimer, secondsRemaining, isWarning } = useInactivityTimer(
    inactivitySeconds,
    () => {
      setMode('ATTRACT');
      setIsQrBridgeOpen(false);
      setIsBookingOpen(false);
      // Forced mount key bump destroys DOM form memory & wipes guest PII
      setSessionResetKey((prev) => prev + 1);
    },
    mode === 'INTERACTIVE',
    10 // 10 seconds warning
  );

  // E2E test listeners for automated QA
  useEffect(() => {
    const handleTimeout = () => {
      setMode('ATTRACT');
      setIsQrBridgeOpen(false);
      setIsBookingOpen(false);
      setSessionResetKey((prev) => prev + 1);
    };
    window.addEventListener('test-inactivity-timeout', handleTimeout);
    return () => {
      window.removeEventListener('test-inactivity-timeout', handleTimeout);
    };
  }, []);

  const handleFirstTouch = () => {
    if (mode === 'ATTRACT') {
      setMode('INTERACTIVE');
    }
    resetTimer();
  };

  const mobileUrl = `${window.location.origin}/menu/${restaurantData.slug}`;

  return (
    <div
      className="kiosk-screen"
      onContextMenu={(e) => e.preventDefault()}
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000',
        overflow: 'hidden',
        position: 'relative',
        overscrollBehavior: 'none',
        touchAction: 'pan-y',
        userSelect: 'none',
        WebkitUserSelect: 'none'
      }}
    >
      {mode === 'ATTRACT' ? (
        <AttractScreen
          restaurant={restaurantData}
          onExplore={handleFirstTouch}
          onOpenBooking={() => setIsBookingOpen(true)}
          qrUrl={mobileUrl}
        />
      ) : (
        <InteractiveMenu
          restaurantData={restaurantData}
          onOpenQrBridge={() => setIsQrBridgeOpen(true)}
          onActivity={resetTimer}
        />
      )}

      {/* 10-Second Idle Warning Dialog before Attract reset */}
      {mode === 'INTERACTIVE' && isWarning && (
        <div
          onClick={resetTimer}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: 'rgba(9, 9, 11, 0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            animation: 'fadeIn 0.25s ease'
          }}
        >
          <div
            style={{
              maxWidth: '460px',
              width: '100%',
              backgroundColor: 'rgba(18, 18, 24, 0.96)',
              border: '2px solid var(--accent-gold)',
              borderRadius: '24px',
              padding: '36px 32px',
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.9), 0 0 40px rgba(212, 175, 55, 0.25)'
            }}
          >
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                backgroundColor: 'rgba(212, 175, 55, 0.15)',
                border: '2px solid var(--accent-gold)',
                color: 'var(--accent-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '26px',
                fontWeight: '800',
                margin: '0 auto 18px'
              }}
            >
              {secondsRemaining}
            </div>

            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', color: '#fff', margin: '0 0 10px' }}>
              Вы ещё выбираете?
            </h3>
            <p style={{ fontSize: '15px', color: 'var(--text-muted)', lineHeight: '1.5', margin: '0 0 24px' }}>
              Экран перейдёт в режим заставки через <b style={{ color: 'var(--accent-gold)' }}>{secondsRemaining} сек</b>. Коснитесь для продолжения.
            </p>

            <button
              onClick={resetTimer}
              style={{
                width: '100%',
                background: 'var(--accent-gold-gradient)',
                border: 'none',
                borderRadius: '16px',
                padding: '16px',
                color: '#09090b',
                fontWeight: '700',
                fontSize: '16px',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(212, 175, 55, 0.4)'
              }}
            >
              Продолжить просмотр меню
            </button>
          </div>
        </div>
      )}

      {/* QR Bridge modal */}
      {isQrBridgeOpen && (
        <QrBridgeModal
          qrUrl={mobileUrl}
          restaurantName={restaurantData.name}
          onClose={() => {
            setIsQrBridgeOpen(false);
            resetTimer();
          }}
        />
      )}

      {/* Street Kiosk Table Reservation Modal */}
      {isBookingOpen && (
        <BookingModal
          key={sessionResetKey}
          restaurantSlug={restaurantData.slug}
          restaurantName={restaurantData.name}
          onClose={() => {
            setIsBookingOpen(false);
            resetTimer();
          }}
        />
      )}
    </div>
  );
};
