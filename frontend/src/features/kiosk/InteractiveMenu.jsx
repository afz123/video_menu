import React, { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GoldButton } from '../../components/ui/GoldButton';
import { LanguagePicker } from '../../components/ui/LanguagePicker';
import { VideoPlayer } from '../../components/video/VideoPlayer';
import { useLanguage } from '../../context/LanguageContext';
import { QrCode, Sparkles, X, ChevronRight, Clock, AlertCircle } from 'lucide-react';

export const InteractiveMenu = ({
  restaurantData,
  onOpenQrBridge,
  onActivity
}) => {
  const { t } = useLanguage();
  const categories = restaurantData.categories || [];
  const [activeCategoryId, setActiveCategoryId] = useState(() => categories[0]?.id || 1);
  const [selectedDish, setSelectedDish] = useState(null);

  const activeCategory = categories.find((c) => c.id === activeCategoryId) || categories[0];
  const dishes = activeCategory ? activeCategory.dishes : [];

  return (
    <div
      onClick={onActivity}
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: 'var(--bg-core)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* 1. Kiosk Top Bar */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '24px 40px',
          borderBottom: '1px solid var(--glass-border-subtle)',
          background: 'rgba(9, 9, 11, 0.85)',
          backdropFilter: 'blur(20px)',
          zIndex: 30
        }}
      >
        <div>
          <span
            style={{
              fontSize: '12px',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: 'var(--accent-gold)',
              fontWeight: '700'
            }}
          >
            Интерактивная Витрина
          </span>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '38px',
              fontWeight: '600',
              lineHeight: '1.1',
              color: 'var(--text-main)'
            }}
          >
            {restaurantData.name}
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Language selector */}
          <LanguagePicker variant="inline" />

          {/* QR Bridge button */}
          <GoldButton
            variant="primary"
            size="md"
            icon={QrCode}
            onClick={onOpenQrBridge}
          >
            Забрать меню на телефон
          </GoldButton>
        </div>
      </header>

      {/* 2. Horizontal Category Selector Bar */}
      <nav
        style={{
          display: 'flex',
          gap: '12px',
          padding: '16px 40px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          background: 'rgba(15, 15, 19, 0.6)',
          borderBottom: '1px solid var(--glass-border-subtle)',
          zIndex: 20
        }}
      >
        {categories.map((cat) => {
          const isActive = activeCategoryId === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategoryId(cat.id);
                if (onActivity) onActivity();
              }}
              style={{
                padding: '14px 28px',
                borderRadius: '30px',
                fontSize: '16px',
                fontWeight: isActive ? '700' : '500',
                letterSpacing: '0.04em',
                whiteSpace: 'nowrap',
                border: isActive ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                background: isActive ? 'var(--accent-gold-gradient)' : 'rgba(25, 25, 32, 0.6)',
                color: isActive ? '#09090b' : 'var(--text-main)',
                boxShadow: isActive ? '0 8px 24px rgba(212, 175, 55, 0.35)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.25s ease'
              }}
            >
              {t(cat.name)}
            </button>
          );
        })}
      </nav>

      {/* 3. Catalog Grid */}
      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '40px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '30px',
          alignContent: 'start'
        }}
      >
        {dishes.map((dish) => {
          const name = t(dish.name);
          const desc = t(dish.description);

          return (
            <GlassCard
              key={dish.id}
              onClick={() => {
                setSelectedDish(dish);
                if (onActivity) onActivity();
              }}
              style={{
                height: '480px',
                padding: 0,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '24px',
                border: '1px solid var(--glass-border)'
              }}
            >
              {/* Media preview area */}
              <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <VideoPlayer
                  lqip={dish.media?.lqip}
                  poster={dish.media?.poster}
                  videoSrc={dish.media?.video_mobile}
                  isCurrent={true}
                  enableSoundToggle={false}
                />

                {dish.is_featured && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '16px',
                      left: '16px',
                      background: 'rgba(10, 10, 12, 0.75)',
                      backdropFilter: 'blur(12px)',
                      color: 'var(--accent-gold)',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '700',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      border: '1px solid var(--glass-border)'
                    }}
                  >
                    <Sparkles size={14} />
                    <span>Special</span>
                  </div>
                )}
              </div>

              {/* Bottom text info */}
              <div
                style={{
                  padding: '24px',
                  background: 'rgba(12, 12, 16, 0.95)',
                  backdropFilter: 'blur(20px)',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: '8px'
                  }}
                >
                  <h3
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '24px',
                      fontWeight: '600',
                      color: 'var(--text-main)',
                      lineHeight: '1.2'
                    }}
                  >
                    {name}
                  </h3>
                  <div
                    style={{
                      fontSize: '22px',
                      fontWeight: '700',
                      color: 'var(--accent-gold)',
                      whiteSpace: 'nowrap',
                      marginLeft: '12px'
                    }}
                  >
                    {dish.price} {dish.currency}
                  </div>
                </div>

                {desc && (
                  <p
                    className="line-clamp-2"
                    style={{
                      fontSize: '14px',
                      color: 'var(--text-muted)',
                      lineHeight: '1.5',
                      marginBottom: '14px'
                    }}
                  >
                    {desc}
                  </p>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '13px',
                    color: 'var(--text-muted)'
                  }}
                >
                  <span>{dish.weight || '300 г'}</span>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: 'var(--accent-gold)',
                      fontWeight: '600'
                    }}
                  >
                    <span>Подробнее</span>
                    <ChevronRight size={16} />
                  </div>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </main>

      {/* 4. Full-Screen Cinematic Dish Detail Modal */}
      {selectedDish && (
        <div
          onClick={() => setSelectedDish(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 80,
            backgroundColor: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(24px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '920px',
              height: '80vh',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--glass-border)',
              borderRadius: '32px',
              overflow: 'hidden',
              display: 'flex',
              position: 'relative',
              boxShadow: '0 30px 80px rgba(0,0,0,0.8)'
            }}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedDish(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                zIndex: 30,
                background: 'rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={22} />
            </button>

            {/* Left 50%: Looped Video */}
            <div style={{ width: '50%', height: '100%', position: 'relative' }}>
              <VideoPlayer
                lqip={selectedDish.media?.lqip}
                poster={selectedDish.media?.poster}
                videoSrc={selectedDish.media?.video_kiosk || selectedDish.media?.video_mobile}
                isCurrent={true}
                enableSoundToggle={true}
              />
            </div>

            {/* Right 50%: Dish Details */}
            <div
              style={{
                width: '50%',
                height: '100%',
                padding: '48px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                overflowY: 'auto'
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '13px',
                    color: 'var(--accent-gold)',
                    fontWeight: '700',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase'
                  }}
                >
                  {t(activeCategory.name)}
                </span>
                <h2
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '40px',
                    fontWeight: '600',
                    color: 'var(--text-main)',
                    marginTop: '8px',
                    marginBottom: '16px',
                    lineHeight: '1.15'
                  }}
                >
                  {t(selectedDish.name)}
                </h2>

                <div
                  style={{
                    fontSize: '34px',
                    fontWeight: '700',
                    color: 'var(--accent-gold)',
                    marginBottom: '24px'
                  }}
                >
                  {selectedDish.price} {selectedDish.currency}
                </div>

                {(() => {
                  const rawDesc = t(selectedDish.description);
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
                    <div style={{ marginBottom: '28px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {shortDesc && (
                        <p style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.85)', lineHeight: '1.6', margin: 0 }}>
                          {shortDesc}
                        </p>
                      )}
                      {ingredients && (
                        <div style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <span style={{ color: 'var(--accent-gold)', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>
                            🌿 Состав и ингредиенты:
                          </span>
                          <span style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px', lineHeight: '1.5' }}>
                            {ingredients}
                          </span>
                        </div>
                      )}
                      {serving && (
                        <div style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <span style={{ color: 'var(--accent-gold)', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>
                            🍽️ Особенности подачи:
                          </span>
                          <span style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px', lineHeight: '1.5' }}>
                            {serving}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Specs */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    padding: '20px',
                    borderRadius: '16px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Выход блюда:</span>
                    <span style={{ fontWeight: '600' }}>{selectedDish.weight || '350 г'}</span>
                  </div>
                  {selectedDish.calories && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Калорийность:</span>
                      <span style={{ fontWeight: '600' }}>{selectedDish.calories}</span>
                    </div>
                  )}
                  {selectedDish.allergens && selectedDish.allergens.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b' }}>
                      <span>Аллергены:</span>
                      <span style={{ fontWeight: '600' }}>{selectedDish.allergens.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom callout */}
              <div style={{ paddingTop: '24px' }}>
                <GoldButton
                  variant="primary"
                  size="lg"
                  icon={QrCode}
                  onClick={onOpenQrBridge}
                  style={{ width: '100%' }}
                >
                  Сканировать блюдо в телефон
                </GoldButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
