import React, { useState, useRef, useEffect } from 'react';
import { useLanguage, SUPPORTED_LANGUAGES } from '../../context/LanguageContext';
import { CategoryDrawer } from './CategoryDrawer';
import { LanguageDrawer } from './LanguageDrawer';
import { Menu, ChevronDown, Layers, Sparkles, Globe } from 'lucide-react';

export const MobileHeader = ({
  restaurantName = 'ASR Maison Royale',
  categories = [],
  activeCategoryId,
  onSelectCategory,
  badgeFilter = 'ALL',
  onSelectBadgeFilter
}) => {
  const { currentLang, t } = useLanguage();
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false);
  const [isLanguageDrawerOpen, setIsLanguageDrawerOpen] = useState(false);
  const scrollRef = useRef(null);

  // Find current language object
  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) || {
    flag: '🌐',
    short: currentLang.toUpperCase()
  };

  // Auto-scroll active category tab into view
  useEffect(() => {
    if (!scrollRef.current) return;
    const activeBtn = scrollRef.current.querySelector('[data-active="true"]');
    if (activeBtn) {
      activeBtn.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [activeCategoryId]);

  return (
    <>
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background:
            'linear-gradient(180deg, rgba(9, 9, 11, 0.92) 0%, rgba(9, 9, 11, 0.65) 60%, transparent 100%)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          paddingTop: 'max(12px, env(safe-area-inset-top))',
          paddingBottom: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}
      >
        {/* ROW 1: Brand Bar + Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px'
          }}
        >
          {/* Left: Open Category Drawer Button */}
          <button
            onClick={() => setIsCategoryDrawerOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '20px',
              padding: '6px 14px',
              color: '#fff',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              transition: 'all 0.2s ease'
            }}
          >
            <Menu size={15} style={{ color: 'var(--accent-gold)' }} />
            <span>Разделы</span>
            <span
              style={{
                backgroundColor: 'rgba(212, 175, 55, 0.25)',
                color: 'var(--accent-gold-light)',
                borderRadius: '10px',
                padding: '1px 6px',
                fontSize: '11px',
                fontWeight: '700',
                marginLeft: '2px'
              }}
            >
              {categories.length}
            </span>
          </button>

          {/* Center: Restaurant Brand Name */}
          <div
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '18px',
              fontWeight: '600',
              color: '#fff',
              letterSpacing: '0.04em',
              textAlign: 'center',
              textShadow: '0 2px 10px rgba(0,0,0,0.8)'
            }}
          >
            {restaurantName}
          </div>

          {/* Right: Language Pill */}
          <button
            onClick={() => setIsLanguageDrawerOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid var(--glass-border)',
              borderRadius: '20px',
              padding: '6px 14px',
              color: '#fff',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              transition: 'all 0.2s ease'
            }}
          >
            <Globe size={14} style={{ color: 'var(--accent-gold)' }} />
            <span>{currentLangObj.short}</span>
            <ChevronDown size={14} style={{ color: 'var(--accent-gold)' }} />
          </button>
        </div>

        {/* ROW 2: Horizontal Scrollable Category Pills */}
        <div
          ref={scrollRef}
          style={{
            display: 'flex',
            gap: '8px',
            padding: '0 16px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
            scrollSnapType: 'x mandatory'
          }}
        >
          {categories.map((cat) => {
            const isActive = cat.id === activeCategoryId;
            const dishCount = cat.dishes?.length || 0;

            return (
              <button
                key={cat.id}
                data-active={isActive ? 'true' : 'false'}
                onClick={() => onSelectCategory(cat.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 16px',
                  borderRadius: '22px',
                  fontSize: '12px',
                  fontWeight: isActive ? '700' : '600',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  scrollSnapAlign: 'center',
                  border: isActive ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: isActive
                    ? 'var(--accent-gold-gradient)'
                    : 'rgba(16, 16, 22, 0.75)',
                  color: isActive ? '#09090b' : 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  boxShadow: isActive
                    ? '0 4px 18px rgba(212, 175, 55, 0.4)'
                    : '0 2px 8px rgba(0, 0, 0, 0.4)',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  transform: isActive ? 'scale(1.03)' : 'scale(1)'
                }}
              >
                <span>{t(cat.name)}</span>
                <span
                  style={{
                    backgroundColor: isActive
                      ? 'rgba(0, 0, 0, 0.2)'
                      : 'rgba(255, 255, 255, 0.1)',
                    color: isActive ? '#09090b' : 'var(--text-muted)',
                    borderRadius: '10px',
                    padding: '1px 6px',
                    fontSize: '11px',
                    fontWeight: '700'
                  }}
                >
                  {dishCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* ROW 3: Quick Dietary & Taste Filter Chips */}
        {onSelectBadgeFilter && (
          <div
            style={{
              display: 'flex',
              gap: '6px',
              padding: '0 16px',
              overflowX: 'auto',
              scrollbarWidth: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {[
              { id: 'ALL', label: 'Все блюда', icon: '✨' },
              { id: 'Хит', label: 'Хиты', icon: '🔥' },
              { id: 'Шеф', label: 'Выбор Шефа', icon: '⭐' },
              { id: 'Острое', label: 'Острое', icon: '🌶️' },
              { id: 'Премиум', label: 'Премиум', icon: '👑' }
            ].map((chip) => {
              const isSelected = badgeFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => onSelectBadgeFilter(chip.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: isSelected ? '700' : '500',
                    border: isSelected
                      ? '1px solid var(--accent-gold)'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    background: isSelected
                      ? 'rgba(212, 175, 55, 0.18)'
                      : 'rgba(255, 255, 255, 0.04)',
                    color: isSelected ? 'var(--accent-gold)' : 'rgba(255, 255, 255, 0.7)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    backdropFilter: 'blur(8px)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{chip.icon}</span>
                  <span>{chip.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Category Bottom Sheet */}
      <CategoryDrawer
        isOpen={isCategoryDrawerOpen}
        onClose={() => setIsCategoryDrawerOpen(false)}
        categories={categories}
        activeCategoryId={activeCategoryId}
        onSelectCategory={onSelectCategory}
      />

      {/* Language Bottom Sheet */}
      <LanguageDrawer
        isOpen={isLanguageDrawerOpen}
        onClose={() => setIsLanguageDrawerOpen(false)}
      />
    </>
  );
};
