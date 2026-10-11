import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Smartphone, ArrowRight } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';

export const QrBridgeModal = ({ qrUrl, restaurantName, onClose }) => {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '520px' }}
      >
        <GlassCard
          style={{
            padding: '40px',
            textAlign: 'center',
            position: 'relative'
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-main)',
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>

          <div
            style={{
              display: 'inline-flex',
              padding: '12px',
              borderRadius: '50%',
              background: 'rgba(212, 175, 55, 0.15)',
              color: 'var(--accent-gold)',
              marginBottom: '16px'
            }}
          >
            <Smartphone size={32} />
          </div>

          <h3
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '36px',
              color: 'var(--text-main)',
              marginBottom: '10px'
            }}
          >
            Меню в вашем смартфоне
          </h3>

          <p
            style={{
              fontSize: '16px',
              color: 'var(--text-muted)',
              marginBottom: '28px',
              lineHeight: '1.5'
            }}
          >
            Наведите камеру любого телефона на QR-код ниже, чтобы продолжить просмотр в быстром Reels-формате без скачивания приложений
          </p>

          {/* QR Code Container */}
          <div
            style={{
              display: 'inline-block',
              background: '#ffffff',
              padding: '20px',
              borderRadius: '24px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(212, 175, 55, 0.3)',
              marginBottom: '24px'
            }}
          >
            <QRCodeSVG value={qrUrl} size={240} level="H" includeMargin={false} />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '14px',
              color: 'var(--accent-gold)'
            }}
          >
            <span>{restaurantName}</span>
            <ArrowRight size={14} />
            <span>Мгновенный переход</span>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
