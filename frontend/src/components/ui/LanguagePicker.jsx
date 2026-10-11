import React from 'react';
import { useLanguage, SUPPORTED_LANGUAGES } from '../../context/LanguageContext';

export const LanguagePicker = ({ variant = 'floating' }) => {
  const { currentLang, setLang, supportedLocales } = useLanguage();

  const locales = SUPPORTED_LANGUAGES.filter((item) =>
    supportedLocales.includes(item.code)
  );

  if (locales.length <= 1) return null;

  if (variant === 'floating') {
    return (
      <div
        style={{
          position: 'fixed',
          top: '18px',
          right: '18px',
          zIndex: 60,
          display: 'flex',
          gap: '4px',
          background: 'rgba(10, 10, 14, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          padding: '4px',
          borderRadius: '30px',
          border: '1px solid var(--glass-border)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
        }}
      >
        {locales.map((item) => {
          const isActive = currentLang === item.code;
          return (
            <button
              key={item.code}
              onClick={() => setLang(item.code)}
              style={{
                background: isActive ? 'var(--accent-gold-gradient)' : 'transparent',
                color: isActive ? '#09090b' : 'var(--text-muted)',
                fontWeight: isActive ? '700' : '500',
                border: 'none',
                borderRadius: '20px',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>{item.flag}</span>
              <span>{item.short}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Inline buttons
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      {locales.map((item) => {
        const isActive = currentLang === item.code;
        return (
          <button
            key={item.code}
            onClick={() => setLang(item.code)}
            style={{
              background: isActive ? 'var(--accent-gold)' : 'rgba(255,255,255,0.06)',
              color: isActive ? '#09090b' : 'var(--text-main)',
              border: isActive ? 'none' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: isActive ? '600' : '400'
            }}
          >
            {item.flag} {item.label}
          </button>
        );
      })}
    </div>
  );
};
