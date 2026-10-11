import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

export const defaultTheme = {
  theme_id: 'luxury_dark_gold',
  colors: {
    background: '#09090b',
    surface: 'rgba(18, 18, 22, 0.70)',
    primary_accent: '#d4af37',
    secondary_accent: '#f59e0b',
    text_primary: '#f8fafc',
    text_secondary: '#94a3b8',
    border_glow: 'rgba(212, 175, 55, 0.25)'
  },
  typography: {
    font_title: "'Cormorant Garamond', serif",
    font_body: "'Plus Jakarta Sans', sans-serif"
  },
  kiosk_settings: {
    inactivity_seconds: 45,
    attract_video_url: '',
    show_qr_overlay: true,
    headline: "L'Étoile Luxury",
    subheadline: "Коснитесь экрана, чтобы открыть меню"
  }
};

export const ThemeProvider = ({ initialTheme, children }) => {
  const [theme, setTheme] = useState(initialTheme || defaultTheme);

  useEffect(() => {
    if (!theme) return;
    const root = document.documentElement;
    const colors = theme.colors || defaultTheme.colors;
    const typography = theme.typography || defaultTheme.typography;

    if (colors.background) root.style.setProperty('--bg-core', colors.background);
    if (colors.surface) root.style.setProperty('--bg-surface', colors.surface);
    if (colors.primary_accent) {
      root.style.setProperty('--accent-gold', colors.primary_accent);
      root.style.setProperty('--accent-gold-gradient', `linear-gradient(135deg, #f7d774 0%, ${colors.primary_accent} 50%, #997819 100%)`);
    }
    if (colors.text_primary) root.style.setProperty('--text-main', colors.text_primary);
    if (colors.text_secondary) root.style.setProperty('--text-muted', colors.text_secondary);
    if (colors.border_glow) root.style.setProperty('--glass-border', colors.border_glow);

    if (typography.font_title) root.style.setProperty('--font-serif', typography.font_title);
    if (typography.font_body) root.style.setProperty('--font-sans', typography.font_body);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  return context || { theme: defaultTheme, setTheme: () => {} };
};
