import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext(null);

export const SUPPORTED_LANGUAGES = [
  { code: 'ru', label: 'Русский', short: 'RU', flag: '🇷🇺' },
  { code: 'en', label: 'English', short: 'EN', flag: '🇬🇧' },
  { code: 'tj', label: 'Тоҷикӣ', short: 'TJ', flag: '🇹🇯' }
];

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
