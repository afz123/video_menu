import React from 'react';
import { Sparkles, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useUI } from '../../context/UIConfigContext';

export const AttractScreen = ({ restaurant, onExplore, onOpenBooking, qrUrl }) => {
  const ui = useUI();
  const kioskUI = ui?.kiosk || {};
  const theme = restaurant.theme || {};
  const kiosk = theme.kiosk_settings || {};
  const attractVideo = kiosk.attract_video_url || '/static/videos/attract_royale_kiosk.mp4';
  const headline = kiosk.headline || restaurant.name;
  const subheadline = kiosk.subheadline || 'Коснитесь экрана, чтобы открыть меню';

  return (
    <div
      onClick={onExplore}
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000',
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '60px'
      }}
    >
      {/* 1. Full-screen Attract Video */}
      <video
        src={attractVideo}
        autoPlay
        loop
        muted
        playsInline
        webkit-playsinline="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: 'brightness(0.85)'
        }}
      />

      {/* Cinematic Vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.85) 100%), linear-gradient(to top, rgba(0,0,0,0.95) 0%, transparent 40%, rgba(0,0,0,0.7) 100%)',
          pointerEvents: 'none'
        }}
      />

      {/* Top Header info */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-gold)',
              boxShadow: '0 0 16px var(--accent-gold)'
            }}
          />
          <span
            style={{
              fontSize: '16px',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: 'var(--text-main)',
              fontWeight: '600'
            }}
          >
            Digital Interactive Showcase
          </span>
        </div>

        {/* Floating Mini QR on attract screen */}
        {qrUrl && kioskUI.show_mini_qr !== false && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              background: 'rgba(10, 10, 14, 0.7)',
              backdropFilter: 'blur(20px)',
              padding: '10px 18px',
              borderRadius: '16px',
              border: '1px solid var(--glass-border)'
            }}
          >
            <div style={{ background: '#fff', padding: '4px', borderRadius: '6px' }}>
              <QRCodeSVG value={qrUrl} size={48} level="M" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '12px', color: 'var(--accent-gold)', fontWeight: '700' }}>QR МЕНЮ</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>В вашем телефоне</div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Center Hero Call-to-Action */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          textAlign: 'center',
          maxWidth: '900px',
          margin: '0 auto 40px auto'
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--accent-gold)',
            fontSize: '16px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginBottom: '16px',
            fontWeight: '600'
          }}
        >
          <Sparkles size={18} />
          <span>Haute Cuisine Video Experience</span>
          <Sparkles size={18} />
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '84px',
            lineHeight: '1.05',
            fontWeight: '600',
            letterSpacing: '0.04em',
            marginBottom: '24px',
            color: '#fff',
            textShadow: '0 8px 32px rgba(0,0,0,0.8)'
          }}
        >
          {headline}
        </h1>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div
            className="animate-pulse-glow"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '14px',
              background: 'var(--accent-gold-gradient)',
              color: '#09090b',
              padding: '20px 48px',
              borderRadius: '40px',
              fontSize: '22px',
              fontWeight: '700',
              boxShadow: '0 12px 40px rgba(212, 175, 55, 0.45)',
              letterSpacing: '0.02em'
            }}
          >
            <span>{subheadline}</span>
          </div>

          {kioskUI.show_booking_btn !== false && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenBooking) onOpenBooking();
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                backgroundColor: 'rgba(18, 18, 24, 0.88)',
                border: '2px solid var(--accent-gold)',
                color: 'var(--accent-gold)',
                padding: '18px 36px',
                borderRadius: '40px',
                fontSize: '20px',
                fontWeight: '700',
                cursor: 'pointer',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
                transition: 'all 0.2s ease'
              }}
            >
              <span>📅 Забронировать стол</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
