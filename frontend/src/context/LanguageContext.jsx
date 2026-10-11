import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext(null);

export const AVAILABLE_LANGUAGES = [
  { code: 'ru', label: 'Русский', short: 'RU', flag: '🇷🇺' },
  { code: 'tj', label: 'Тоҷикӣ', short: 'TJ', flag: '🇹🇯' },
  { code: 'en', label: 'English', short: 'EN', flag: '🇬🇧' },
  { code: 'uz', label: "O'zbekcha", short: 'UZ', flag: '🇺🇿' },
  { code: 'tr', label: 'Türkçe', short: 'TR', flag: '🇹🇷' },
  { code: 'ar', label: 'العربية', short: 'AR', flag: '🇦🇪' },
  { code: 'zh', label: '中文', short: 'ZH', flag: '🇨🇳' },
  { code: 'fr', label: 'Français', short: 'FR', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', short: 'DE', flag: '🇩🇪' },
  { code: 'es', label: 'Español', short: 'ES', flag: '🇪🇸' },
  { code: 'it', label: 'Italiano', short: 'IT', flag: '🇮🇹' },
  { code: 'fa', label: 'فارسی', short: 'FA', flag: '🇮🇷' },
  { code: 'kk', label: 'Қазақша', short: 'KK', flag: '🇰🇿' },
  { code: 'ky', label: 'Кыргызча', short: 'KY', flag: '🇰🇬' }
];

export const SUPPORTED_LANGUAGES = AVAILABLE_LANGUAGES;

export const LanguageProvider = ({ supportedLocales = ['ru', 'en', 'tj'], defaultLocale = 'ru', children }) => {
  const [currentLang, setCurrentLang] = useState(() => {
    const saved = localStorage.getItem('user_menu_lang');
    if (saved && supportedLocales.includes(saved)) return saved;
    return defaultLocale;
  });

  useEffect(() => {
    localStorage.setItem('user_menu_lang', currentLang);
  }, [currentLang]);

  // Helper to translate JSON dictionary field: {"ru": "...", "en": "..."}
  const t = (transObj, fallback = '') => {
    if (!transObj) return fallback;
    if (typeof transObj === 'string') return transObj;
    return transObj[currentLang] || transObj[defaultLocale] || transObj['ru'] || transObj['en'] || Object.values(transObj)[0] || fallback;
  };

  return (
    <LanguageContext.Provider value={{ currentLang, setLang: setCurrentLang, t, supportedLocales }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  return context || {
    currentLang: 'ru',
    setLang: () => {},
    t: (obj) => (typeof obj === 'string' ? obj : obj?.ru || ''),
    supportedLocales: ['ru', 'en', 'tj']
  };
};
