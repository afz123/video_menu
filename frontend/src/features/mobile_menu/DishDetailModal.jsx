import React from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { useLanguage } from '../../context/LanguageContext';
import { useUI } from '../../context/UIConfigContext';
import { X, Plus, AlertCircle, Sparkles, Wine, Flame, Star, Check } from 'lucide-react';

export const DishDetailModal = ({
  dish,
  onClose,
  onAddToCart,
  onAddPairingToCart
}) => {
  const { t } = useLanguage();
  const ui = useUI();
  const card = ui?.dish_card || {};

  if (!dish) return null;

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
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.2s ease forwards'
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxHeight: '85vh',
          backgroundColor: '#121217',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          borderTop: '1px solid rgba(212, 175, 55, 0.35)',
          padding: '16px 20px calc(24px + env(safe-area-inset-bottom)) 20px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -12px 40px rgba(0, 0, 0, 0.85)',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}
      >
        {/* Drag handle */}
        <div
          style={{
            width: '40px',
            height: '4px',
            borderRadius: '2px',
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            margin: '0 auto 14px'
          }}
        />

        {/* Modal Top Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '12px'
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Badges */}
            {badges.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '6px' }}>
                {badges.map((badge, bIdx) => (
                  <span
                    key={bIdx}
                    style={{
                      background: badge.includes('Шеф') || badge.includes('Хит')
                        ? 'var(--accent-gold-gradient)'
                        : badge.includes('Острое')
                        ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'
                        : 'rgba(255, 255, 255, 0.08)',
                      color: badge.includes('Шеф') || badge.includes('Хит') ? '#09090b' : '#fff',
                      padding: '3px 8px',
                      borderRadius: '12px',
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
            )}
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '22px',
                fontWeight: '600',
                color: '#fff',
                margin: 0,
                lineHeight: '1.25'
              }}
            >
              {name}
            </h2>
            {dish.weight && (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', display: 'inline-block' }}>
                Вес: {dish.weight}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: 'var(--text-main)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable details content */}
        <div
          style={{
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            paddingRight: '4px',
            marginBottom: '16px'
          }}
        >
          {/* Full description */}
          {shortDesc && (
            <p
              style={{
                fontSize: '14px',
                lineHeight: '1.5',
                color: 'rgba(255, 255, 255, 0.88)',
                margin: 0
              }}
            >
              {shortDesc}
            </p>
          )}

          {/* Sommelier wine / drink pairing recommendation */}
          {pairings.length > 0 && (pairings[0]?.text || pairings[0]?.name || typeof pairings[0] === 'string') && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                backgroundColor: 'rgba(212, 175, 55, 0.1)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                borderRadius: '12px',
                padding: '10px 12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--accent-gold)' }}>
                <Wine size={18} style={{ flexShrink: 0 }} />
                <div>
                  <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', color: 'var(--accent-gold)' }}>
                    Рекомендация сомелье:
                  </span>
                  <span style={{ color: '#fff', fontWeight: '500' }}>
                    {pairings[0].text || pairings[0].name || (typeof pairings[0] === 'string' ? pairings[0] : '')}
                  </span>
                </div>
              </div>
              {onAddPairingToCart && (
                <button
                  type="button"
                  onClick={() => onAddPairingToCart(pairings[0], dish)}
                  style={{
                    background: 'var(--accent-gold-gradient)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#09090b',
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '6px 10px',
                    cursor: 'pointer',
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Plus size={12} strokeWidth={3} />
                  <span>В заказ</span>
                </button>
              )}
            </div>
          )}

          {/* Ingredients */}
          {ingredients && (
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                padding: '12px',
                border: '1px solid rgba(255, 255, 255, 0.06)'
              }}
            >
              <div style={{ color: 'var(--accent-gold)', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                🌿 Состав и ингредиенты:
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '13px', lineHeight: '1.45' }}>
                {ingredients}
              </div>
            </div>
          )}

          {/* Serving details */}
          {serving && (
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                padding: '12px',
                border: '1px solid rgba(255, 255, 255, 0.06)'
              }}
            >
              <div style={{ color: 'var(--accent-gold)', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                🍽️ Особенности подачи:
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '13px', lineHeight: '1.45' }}>
                {serving}
              </div>
            </div>
          )}

          {/* Calories */}
          {dish.calories && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '13px',
                padding: '10px 12px',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '10px'
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>Энергетическая ценность:</span>
              <span style={{ color: '#fff', fontWeight: '600' }}>{dish.calories}</span>
            </div>
          )}

          {/* Allergens */}
          {dish.allergens && dish.allergens.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: '#f59e0b',
                padding: '10px 12px',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderRadius: '10px',
                border: '1px solid rgba(245, 158, 11, 0.2)'
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>Аллергены: {dish.allergens.join(', ')}</span>
            </div>
          )}
        </div>

        {/* Footer Action Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            paddingTop: '12px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Стоимость:</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent-gold)' }}>
              {dish.price} <span style={{ fontSize: '15px' }}>{dish.currency}</span>
            </div>
          </div>

          {onAddToCart && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onAddToCart(dish);
              }}
              style={{
                flex: 1,
                background: 'var(--accent-gold-gradient)',
                border: 'none',
                borderRadius: '14px',
                padding: '14px 20px',
                color: '#09090b',
                fontWeight: '700',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 4px 18px rgba(212, 175, 55, 0.35)'
              }}
            >
              <Plus size={16} strokeWidth={3} />
              <span>{hasModifiers ? 'Настроить & В заказ' : 'В заказ'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

