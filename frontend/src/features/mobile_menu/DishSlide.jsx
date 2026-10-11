import React, { useState } from 'react';
import { VideoPlayer } from '../../components/video/VideoPlayer';
import { GlassCard } from '../../components/ui/GlassCard';
import { useLanguage } from '../../context/LanguageContext';
import { Info, Sparkles, AlertCircle, ChevronUp, ChevronDown } from 'lucide-react';

export const DishSlide = ({ dish, isCurrent, categoryName }) => {
  const { t } = useLanguage();
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const name = t(dish.name);
  const rawDesc = t(dish.description);

  let shortDesc = '';
  let ingredients = '';
  let serving = '';

  if (typeof rawDesc === 'string') {
    shortDesc = rawDesc;
  } else if (rawDesc && typeof rawDesc === 'object') {
    shortDesc = rawDesc.description || rawDesc.text || '';
    ingredients = rawDesc.ingredients || '';
    serving = rawDesc.serving || '';
  }

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

      {/* 2. Cinematic Bottom Vignette Gradient */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '50%',
          background: 'linear-gradient(to top, rgba(9, 9, 11, 0.95) 0%, rgba(9, 9, 11, 0.6) 50%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 15
        }}
      />

      {/* 3. Floating Bottom Luxury Card */}
      <div
        style={{
          position: 'absolute',
          bottom: 'calc(18px + env(safe-area-inset-bottom))',
          left: '14px',
          right: '14px',
          zIndex: 20
        }}
      >
        <GlassCard
          onClick={() => setIsDetailsOpen(!isDetailsOpen)}
          style={{
            cursor: 'pointer',
            padding: '18px 20px',
            transform: isDetailsOpen ? 'translateY(0)' : undefined,
            backgroundColor: 'rgba(15, 15, 20, 0.78)',
            border: '1px solid rgba(212, 175, 55, 0.28)',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.7)'
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
          {shortDesc && (
            <p
              className={isDetailsOpen ? '' : 'line-clamp-2'}
              style={{
                fontSize: '14px',
                lineHeight: '1.5',
                color: 'rgba(244, 244, 246, 0.88)',
                marginBottom: '10px',
                fontWeight: '400'
              }}
            >
              {shortDesc}
            </p>
          )}

          {/* Expanded extra attributes */}
          {isDetailsOpen && (
            <div
              className="animate-fade-in"
              style={{
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                paddingTop: '12px',
                marginTop: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                fontSize: '13px'
              }}
            >
              {/* Ingredients */}
              {ingredients && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ color: 'var(--accent-gold)', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    🌿 Состав и ингредиенты:
                  </span>
                  <span style={{ color: 'rgba(255, 255, 255, 0.9)', lineHeight: '1.45' }}>
                    {ingredients}
                  </span>
                </div>
              )}

              {/* Serving details */}
              {serving && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ color: 'var(--accent-gold)', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    🍽️ Особенности подачи:
                  </span>
                  <span style={{ color: 'rgba(255, 255, 255, 0.9)', lineHeight: '1.45' }}>
                    {serving}
                  </span>
                </div>
              )}

              {/* Calories (ONLY IF PRESENT!) */}
              {dish.calories && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>Энергетическая ценность:</span>
                  <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>{dish.calories}</span>
                </div>
              )}

              {/* Allergens (ONLY IF PRESENT!) */}
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
