import React, { useState } from 'react';
import { VideoPlayer } from '../../components/video/VideoPlayer';
import { GlassCard } from '../../components/ui/GlassCard';
import { useLanguage } from '../../context/LanguageContext';
import { Info, Sparkles, AlertCircle, ChevronUp, ChevronDown, Plus, Wine } from 'lucide-react';

export const DishSlide = ({ dish, isCurrent, categoryName, onAddToCart, onDetailsToggle }) => {
  const { t } = useLanguage();
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const toggleDetails = () => {
    const next = !isDetailsOpen;
    setIsDetailsOpen(next);
    if (onDetailsToggle) onDetailsToggle(next);
  };

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

  const badges = dish.badges || [];
  const pairings = dish.pairings || [];
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
      {/* 1. Background Video Stream */}
      <VideoPlayer
        lqip={dish.media?.lqip}
        poster={dish.media?.poster}
        videoSrc={dish.media?.video_mobile}
        isCurrent={isCurrent}
        enableSoundToggle={true}
      />

      {/* 2. Top/Middle Badges Ribbon */}
      {badges.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(110px + env(safe-area-inset-top))',
            left: '16px',
            zIndex: 25,
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px'
          }}
        >
          {badges.map((badge, bIdx) => (
            <span
              key={bIdx}
              style={{
                background: badge.includes('Шеф') || badge.includes('Хит')
                  ? 'var(--accent-gold-gradient)'
                  : badge.includes('Острое')
                  ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'
                  : 'rgba(15, 15, 20, 0.75)',
                color: badge.includes('Шеф') || badge.includes('Хит') ? '#09090b' : '#fff',
                border: badge.includes('Шеф') || badge.includes('Хит') ? 'none' : '1px solid rgba(255, 255, 255, 0.25)',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '0.04em',
                textTransform: 'uppercase'
              }}
            >
              {badge}
            </span>
          ))}
        </div>
      )}

      {/* 3. Cinematic Bottom Vignette Gradient */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '55%',
          background: 'linear-gradient(to top, rgba(9, 9, 11, 0.96) 0%, rgba(9, 9, 11, 0.65) 50%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 15
        }}
      />

      {/* 4. Floating Bottom Luxury Card */}
      <div
        style={{
          position: 'absolute',
          bottom: 'calc(65px + env(safe-area-inset-bottom))',
          left: '14px',
          right: '14px',
          zIndex: 20
        }}
      >
        <GlassCard
          onClick={toggleDetails}
          style={{
            cursor: 'pointer',
            padding: '16px 18px',
            backgroundColor: 'rgba(15, 15, 20, 0.82)',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.75)'
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
                    marginBottom: '3px'
                  }}
                >
                  <Sparkles size={12} />
                  <span>Шедевр Шефа</span>
                </div>
              )}
              <h2
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '24px',
                  lineHeight: '1.15',
                  fontWeight: '600',
                  color: 'var(--text-main)',
                  letterSpacing: '0.01em',
                  margin: 0
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
                  fontSize: '22px',
                  fontWeight: '700',
                  color: 'var(--accent-gold)',
                  fontFamily: 'var(--font-sans)',
                  letterSpacing: '0.02em'
                }}
              >
                {dish.price} <span style={{ fontSize: '15px' }}>{dish.currency}</span>
              </div>
            </div>
          </div>

          {/* Short description preview */}
          {shortDesc && (
            <p
              className={isDetailsOpen ? '' : 'line-clamp-2'}
              style={{
                fontSize: '13px',
                lineHeight: '1.45',
                color: 'rgba(244, 244, 246, 0.88)',
                marginBottom: '10px',
                fontWeight: '400',
                margin: '0 0 10px 0'
              }}
            >
              {shortDesc}
            </p>
          )}

          {/* Sommelier Pairing Suggestion */}
          {pairings.length > 0 && pairings[0]?.text && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'rgba(212, 175, 55, 0.08)',
                border: '1px solid rgba(212, 175, 55, 0.22)',
                borderRadius: '10px',
                padding: '6px 10px',
                marginBottom: '10px',
                fontSize: '12px',
                color: 'var(--accent-gold)'
              }}
            >
              <Wine size={14} style={{ flexShrink: 0 }} />
              <span style={{ lineHeight: '1.3' }}>{pairings[0].text}</span>
            </div>
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

              {/* Calories */}
              {dish.calories && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>Энергетическая ценность:</span>
                  <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>{dish.calories}</span>
                </div>
              )}

              {/* Allergens */}
              {dish.allergens && dish.allergens.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b' }}>
                  <AlertCircle size={14} />
                  <span>Аллергены: {dish.allergens.join(', ')}</span>
                </div>
              )}
            </div>
          )}

          {/* Footer row: Grams & Detail toggle & Add to Order button */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px',
              color: 'var(--text-muted)',
              paddingTop: '6px',
              borderTop: isDetailsOpen ? '1px solid rgba(255,255,255,0.06)' : 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>{dish.weight || '300 г'}</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  color: 'var(--accent-gold)',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                <span>{isDetailsOpen ? 'Скрыть' : 'Подробнее'}</span>
                {isDetailsOpen ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
              </span>
            </div>

            {/* Quick Add to Cart button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onAddToCart) onAddToCart(dish);
              }}
              style={{
                backgroundColor: 'var(--accent-gold)',
                border: 'none',
                borderRadius: '10px',
                padding: '7px 14px',
                color: '#09090b',
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 2px 10px rgba(212, 175, 55, 0.35)',
                transition: 'transform 0.15s ease'
              }}
            >
              <Plus size={14} strokeWidth={3} />
              <span>{hasModifiers ? 'Настроить & В заказ' : 'В заказ'}</span>
            </button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
