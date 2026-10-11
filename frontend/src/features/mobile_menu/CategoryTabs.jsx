import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export const CategoryTabs = ({ categories, activeCategoryId, onSelectCategory }) => {
  const { t } = useLanguage();

  if (!categories || categories.length === 0) return null;

  return (
    <nav
      style={{
        position: 'fixed',
        top: '16px',
        left: '0',
        right: '0',
        zIndex: 40,
        display: 'flex',
        gap: '8px',
        padding: '0 16px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
        pointerEvents: 'auto'
      }}
    >
      {categories.map((cat) => {
        const isActive = activeCategoryId === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            style={{
              padding: '8px 18px',
              borderRadius: '24px',
              fontSize: '13px',
              fontWeight: isActive ? '700' : '500',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              border: isActive ? 'none' : '1px solid rgba(255, 255, 255, 0.12)',
              background: isActive
                ? 'var(--accent-gold-gradient)'
                : 'rgba(12, 12, 16, 0.65)',
              color: isActive ? '#09090b' : 'var(--text-main)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: isActive
                ? '0 6px 20px rgba(212, 175, 55, 0.35)'
                : '0 4px 12px rgba(0, 0, 0, 0.3)',
              cursor: 'pointer',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              transform: isActive ? 'scale(1.04)' : 'scale(1)'
            }}
          >
            {t(cat.name)}
          </button>
        );
      })}
    </nav>
  );
};
