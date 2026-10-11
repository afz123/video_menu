import React, { useState } from 'react';
import { AttractScreen } from './AttractScreen';
import { InteractiveMenu } from './InteractiveMenu';
import { QrBridgeModal } from './QrBridgeModal';
import { useInactivityTimer } from '../../hooks/useInactivityTimer';

export const KioskContainer = ({ restaurantData }) => {
  const [mode, setMode] = useState('ATTRACT'); // 'ATTRACT' | 'INTERACTIVE'
  const [isQrBridgeOpen, setIsQrBridgeOpen] = useState(false);

  const theme = restaurantData.theme || {};
  const kioskSettings = theme.kiosk_settings || {};
  const inactivitySeconds = kioskSettings.inactivity_seconds || 45;

  // Auto-reset back to Attract screen when idle
  const { resetTimer } = useInactivityTimer(
    inactivitySeconds,
    () => {
      setMode('ATTRACT');
      setIsQrBridgeOpen(false);
    },
    mode === 'INTERACTIVE'
  );

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
        position: 'relative'
      }}
    >
      {mode === 'ATTRACT' ? (
        <AttractScreen
          restaurant={restaurantData}
          onExplore={handleFirstTouch}
          qrUrl={mobileUrl}
        />
      ) : (
        <InteractiveMenu
          restaurantData={restaurantData}
          onOpenQrBridge={() => setIsQrBridgeOpen(true)}
          onActivity={resetTimer}
        />
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
    </div>
  );
};
