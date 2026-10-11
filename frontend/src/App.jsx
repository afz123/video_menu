import React, { useState, useEffect } from 'react';
import { MobileFeed } from './features/mobile_menu/MobileFeed';
import { KioskContainer } from './features/kiosk/KioskContainer';
import { DashboardLayout } from './features/admin/DashboardLayout';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { menuService } from './services/menuService';

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [restaurantData, setRestaurantData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Listen to popstate for back/forward navigation
  useEffect(() => {
    const handleLocationChange = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Parse path: /menu/:slug or /kiosk/:slug or /admin
  const segments = currentPath.split('/').filter(Boolean);
  const routeType = segments[0] || 'menu';
  const slug = segments[1] || 'asr-royale';

  useEffect(() => {
    // If admin route, we load in DashboardLayout itself
    if (routeType === 'admin') {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const data = await menuService.getFullMenu(slug, false);
        setRestaurantData(data);
      } catch (err) {
        console.error('Failed to load menu data:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [routeType, slug]);

  if (isLoading) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          backgroundColor: '#09090b',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          color: '#d4af37'
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(212, 175, 55, 0.2)',
            borderTopColor: '#d4af37',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }}
        />
        <span style={{ fontSize: '13px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          Загрузка Luxury Menu...
        </span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error && routeType !== 'admin') {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          backgroundColor: '#09090b',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
          padding: '24px',
          textAlign: 'center',
          color: '#fff'
        }}
      >
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', color: '#f87171' }}>
          Не удалось загрузить меню
        </h2>
        <p style={{ color: '#94a3b8', maxWidth: '400px' }}>{error}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: 'var(--accent-gold-gradient)',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 24px',
            color: '#09090b',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Повторить попытку
        </button>
      </div>
    );
  }

  // Admin Route
  if (routeType === 'admin') {
    return (
      <ThemeProvider>
        <DashboardLayout />
      </ThemeProvider>
    );
  }

  const restaurant = restaurantData?.restaurant || {};

  return (
    <ThemeProvider initialTheme={restaurant.theme}>
      <LanguageProvider
        supportedLocales={restaurant.supported_locales || ['ru', 'en', 'tj']}
        defaultLocale={restaurant.default_locale || 'ru'}
      >
        {routeType === 'kiosk' ? (
          <KioskContainer restaurantData={{ ...restaurant, categories: restaurantData?.categories }} />
        ) : (
          <MobileFeed restaurantData={restaurantData} />
        )}
      </LanguageProvider>
    </ThemeProvider>
  );
}
