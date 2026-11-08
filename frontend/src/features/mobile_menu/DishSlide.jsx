import React, { useState } from 'react';
import { VideoPlayer } from '../../components/video/VideoPlayer';
import { GlassCard } from '../../components/ui/GlassCard';
import { useLanguage } from '../../context/LanguageContext';
import { useUI } from '../../context/UIConfigContext';
import { Sparkles, Plus, Volume2, VolumeX, Info } from 'lucide-react';
import { DishDetailModal } from './DishDetailModal';

export const DishSlide = ({ 
  dish, 
  isCurrent, 
  shouldMountMedia = true, 
  isSoundEnabled, 
  onToggleSound, 
  categoryName, 
  onAddToCart, 
  onAddPairingToCart, 
  onDetailsToggle 
}) => {
  const { t } = useLanguage();
  const ui = useUI();
  const card = ui?.dish_card || {};
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const openDetails = () => {
    setIsDetailModalOpen(true);
    if (onDetailsToggle) onDetailsToggle(true);
  };

  const closeDetails = () => {
    setIsDetailModalOpen(false);
    if (onDetailsToggle) onDetailsToggle(false);
  };

  const name = t(dish.name);
  const badges = dish.badges || [];
  const hasModifiers = dish.modifiers && dish.modifiers.length > 0;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden'
      }}
    >
      {shouldMountMedia ? (
        <VideoPlayer
          lqip={dish.media?.lqip}
          poster={dish.media?.poster}
          videoSrc={dish.media?.video_mobile}
          isCurrent={isCurrent}
          isSoundEnabled={isSoundEnabled}
          onToggleSound={onToggleSound}
          enableSoundToggle={false}
        />
      ) : (
        <img
          src={dish.media?.poster || dish.media?.lqip}
          alt={name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}

      {/* Cinematic bottom gradient */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '45%',
          background: 'linear-gradient(to top, rgba(9, 9, 11, 0.95) 0%, rgba(9, 9, 11, 0.5) 50%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 15
        }}
      />

      {/* Compact Instagram Reels overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: 'calc(65px + env(safe-area-inset-bottom))',
          left: '12px',
          right: '12px',
          zIndex: 20
        }}
      >
        {/* Row above card: Badges & Sound Toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            marginBottom: '6px',
            pointerEvents: 'auto'
          }}
        >
          {/* Badges on the left */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              alignItems: 'center'
            }}
          >
            {card.show_badges !== false && badges.map((badge, bIdx) => (
              <span
                key={bIdx}
                style={{
                  background: badge.includes('Шеф') || badge.includes('Хит')
                    ? 'var(--accent-gold-gradient)'
                    : badge.includes('Острое')
                    ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'
                    : 'rgba(15, 15, 20, 0.85)',
                  color: badge.includes('Шеф') || badge.includes('Хит') ? '#09090b' : '#fff',
                  border: badge.includes('Шеф') || badge.includes('Хит') ? 'none' : '1px solid rgba(255, 255, 255, 0.25)',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  padding: '3px 8px',
                  borderRadius: '14px',
                  fontSize: '10px',
                  fontWeight: '700',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase'
                }}
              >
                {badge}
              </span>
            ))}
          </div>

          {/* ASMR Sound button directly above card on the right */}
          {card.show_sound_toggle !== false && dish.media?.video_mobile && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleSound) onToggleSound();
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '14px',
                fontSize: '11px',
                fontWeight: '600',
                background: isSoundEnabled
                  ? 'var(--accent-gold-gradient)'
                  : 'rgba(15, 15, 20, 0.85)',
                color: isSoundEnabled ? '#09090b' : 'rgba(255, 255, 255, 0.85)',
                border: isSoundEnabled ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                boxShadow: isSoundEnabled
                  ? '0 4px 14px rgba(212, 175, 55, 0.4)'
                  : '0 4px 12px rgba(0, 0, 0, 0.4)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                flexShrink: 0,
                marginLeft: 'auto'
              }}
              title={isSoundEnabled ? 'Выключить звук блюда' : 'Включить ASMR звук'}
            >
              {isSoundEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
              <span>{isSoundEnabled ? 'Звук ВКЛ' : 'Звук'}</span>
            </button>
          )}
        </div>

        {/* Minimalist Instagram-like Glass Card */}
        <GlassCard
          onClick={openDetails}
          style={{
            cursor: 'pointer',
            padding: '12px 14px',
            backgroundColor: 'rgba(15, 15, 20, 0.78)',
            border: '1px solid rgba(212, 175, 55, 0.28)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          {/* Left side: Dish Name, Weight & tap hint */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {dish.is_featured && card.show_badges !== false && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  fontSize: '10px',
                  color: 'var(--accent-gold)',
                  fontWeight: '700',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginBottom: '2px'
                }}
              >
                <Sparkles size={11} />
                <span>Шедевр Шефа</span>
              </div>
            )}
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '19px',
                lineHeight: '1.2',
                fontWeight: '600',
                color: 'var(--text-main)',
                letterSpacing: '0.01em',
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
              title={name}
            >
              {name}
            </h2>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '4px',
                fontSize: '11px',
                color: 'var(--text-muted)'
              }}
            >
              {card.show_weight !== false && dish.weight && (
                <span>{dish.weight}</span>
              )}
              {card.show_weight !== false && dish.weight && (
                <span>•</span>
              )}
              <span
                style={{
                  color: 'var(--accent-gold)',
                  fontWeight: '500',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px'
                }}
              >
                Подробнее...
              </span>
            </div>
          </div>

          {/* Right side: Price & Add to Cart button */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexShrink: 0
            }}
          >
            {card.show_price !== false && (
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: 'var(--accent-gold)',
                  fontFamily: 'var(--font-sans)',
                  letterSpacing: '0.02em',
                  whiteSpace: 'nowrap'
                }}
              >
                {dish.price} <span style={{ fontSize: '13px' }}>{dish.currency}</span>
              </div>
            )}

            {card.show_add_to_cart_btn !== false && onAddToCart && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart(dish);
                }}
                style={{
                  backgroundColor: 'var(--accent-gold)',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  color: '#09090b',
                  fontWeight: '700',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 2px 10px rgba(212, 175, 55, 0.35)',
                  transition: 'transform 0.15s ease',
                  whiteSpace: 'nowrap'
                }}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <Plus size={14} strokeWidth={3} />
                <span>{hasModifiers ? 'В заказ' : 'В заказ'}</span>
              </button>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Full details Instagram-style bottom sheet when clicked */}
      {isDetailModalOpen && (
        <DishDetailModal
          dish={dish}
          onClose={closeDetails}
          onAddToCart={onAddToCart}
          onAddPairingToCart={onAddPairingToCart}
        />
      )}
    </div>
  );
};
