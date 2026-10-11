import React, { useState } from 'react';
import { VideoPlayer } from '../../components/video/VideoPlayer';
import { GlassCard } from '../../components/ui/GlassCard';
import { useLanguage } from '../../context/LanguageContext';
import { Info, Sparkles, AlertCircle, ChevronUp, ChevronDown } from 'lucide-react';

export const DishSlide = ({ dish, isCurrent, categoryName }) => {
  const { t } = useLanguage();
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const name = t(dish.name);
  const description = t(dish.description);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden'
      }}
    >
      {/* 1. Background Video Stream */}
      <VideoPlayer
        lqip={dish.media?.lqip}
        poster={dish.media?.poster}
        videoSrc={dish.media?.video_mobile}
        isCurrent={isCurrent}
        enableSoundToggle={true}
      />

      {/* 2. Floating Bottom Luxury Card */}
      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          left: '16px',
          right: '16px',
          zIndex: 20
        }}
      >
        <GlassCard
          onClick={() => setIsDetailsOpen(!isDetailsOpen)}
          style={{
            cursor: 'pointer',
            padding: '20px',
            transform: isDetailsOpen ? 'translateY(0)' : undefined
          }}
        >
          {/* Header row: Dish name & Price */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '8px',
              gap: '12px'
            }}
          >
            <div>
              {dish.is_featured && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    color: 'var(--accent-gold)',
                    fontWeight: '700',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: '4px'
                  }}
                >
                  <Sparkles size={12} />
                  <span>Шедевр Шефа</span>
                </div>
              )}
              <h2
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '26px',
                  lineHeight: '1.15',
                  fontWeight: '600',
                  color: 'var(--text-main)',
                  letterSpacing: '0.01em'
                }}
              >
                {name}
              </h2>
            </div>

            <div
              style={{
                textAlign: 'right',
                flexShrink: 0
              }}
            >
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: 'var(--accent-gold)',
                  fontFamily: 'var(--font-sans)',
                  letterSpacing: '0.02em'
                }}
              >
                {dish.price} <span style={{ fontSize: '16px' }}>{dish.currency}</span>
              </div>
            </div>
          </div>

          {/* Short description preview */}
          {description && (
            <p
              className={isDetailsOpen ? '' : 'line-clamp-2'}
              style={{
                fontSize: '14px',
                lineHeight: '1.5',
                color: 'rgba(244, 244, 246, 0.85)',
                marginBottom: '12px',
                fontWeight: '400'
              }}
            >
              {description}
            </p>
          )}

          {/* Expanded extra attributes */}
          {isDetailsOpen && (
            <div
              className="animate-fade-in"
              style={{
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                paddingTop: '12px',
                marginTop: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '13px'
              }}
            >
              {dish.calories && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>Энергетическая ценность:</span>
                  <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>{dish.calories}</span>
                </div>
              )}

              {dish.allergens && dish.allergens.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b' }}>
                  <AlertCircle size={14} />
                  <span>Аллергены: {dish.allergens.join(', ')}</span>
                </div>
              )}
            </div>
          )}

          {/* Footer row: Grams & Category & Tap cue */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px',
              color: 'var(--text-muted)',
              paddingTop: '6px'
            }}
          >
            <span>{dish.weight || '300 г'}</span>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: 'var(--accent-gold)',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em'
              }}
            >
              <span>{isDetailsOpen ? 'Скрыть детали' : 'Подробнее'}</span>
              {isDetailsOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
