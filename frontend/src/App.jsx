import React, { useState, useEffect } from 'react';
import { MobileFeed } from './features/mobile_menu/MobileFeed';
import { KioskContainer } from './features/kiosk/KioskContainer';
import { DashboardLayout } from './features/admin/DashboardLayout';
import { KDSLayout } from './features/kds/KDSLayout';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { UIConfigProvider } from './context/UIConfigContext';
import { ModuleProvider, MODULES } from './context/ModuleContext';
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

  // Parse path: /menu/:slug or /kiosk/:slug or /kds/:slug or /admin
  const segments = currentPath.split('/').filter(Boolean);
  const routeType = segments[0] || 'menu';
  const slug = segments[1] || 'asr-royale';

  useEffect(() => {
    // If admin route, we load in DashboardLayout itself
    if (routeType === 'admin') {
      setIsLoading(false);
      return;
    }

    // Stale-While-Revalidate: Show instant cached menu for 0ms cold-start, revalidate in background
    const cached = menuService.getCachedMenu ? menuService.getCachedMenu(slug, false) : null;
    if (cached) {
      setRestaurantData(cached);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    const fetchData = async () => {
      try {
        const data = await menuService.getFullMenu(slug, false);
        setRestaurantData(data);
      } catch (err) {
        if (!cached) {
          console.error('Failed to load menu data:', err);
          setError(err.message);
        }
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
          Не удалось открыть заведение
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

  // 1. Панель управления (Admin)
  if (routeType === 'admin') {
    return (
      <ThemeProvider>
        <UIConfigProvider>
          <ModuleProvider>
            <DashboardLayout />
          </ModuleProvider>
        </UIConfigProvider>
      </ThemeProvider>
    );
  }

  const restaurant = restaurantData?.restaurant || {};
  const enabledModules = restaurant.enabled_modules || Object.values(MODULES);

  // 2. Кухонный монитор KDS (/kds/:slug) с изоляцией
  if (routeType === 'kds') {
    const hasKds = enabledModules.includes(MODULES.KDS);
    return (
      <ThemeProvider initialTheme={restaurant.theme}>
        <UIConfigProvider customConfig={restaurant.ui_config || restaurant.theme?.ui_config}>
          <ModuleProvider enabledModules={enabledModules}>
            {hasKds ? (
              <KDSLayout restaurantSlug={slug} />
            ) : (
              <ModuleDisabledScreen
                moduleTitle="Кухонный монитор (KDS)"
                description="Модуль диспетчеризации цехов кухни не активирован в тарифном плане данного заведения."
                returnSlug={slug}
              />
            )}
          </ModuleProvider>
        </UIConfigProvider>
      </ThemeProvider>
    );
  }

  // 3. Уличный экран Киоска (/kiosk/:slug) с изоляцией
  if (routeType === 'kiosk') {
    const hasKiosk = enabledModules.includes(MODULES.KIOSK);
    return (
      <ThemeProvider initialTheme={restaurant.theme}>
        <UIConfigProvider customConfig={restaurant.ui_config || restaurant.theme?.ui_config}>
          <ModuleProvider enabledModules={enabledModules}>
            <LanguageProvider
              supportedLocales={restaurant.supported_locales || ['ru', 'en', 'tj']}
              defaultLocale={restaurant.default_locale || 'ru'}
            >
              {hasKiosk ? (
                <KioskContainer restaurantData={{ ...restaurant, categories: restaurantData?.categories }} />
              ) : (
                <ModuleDisabledScreen
                  moduleTitle="Smart Interactive Kiosk"
                  description="Модуль интерактивной уличной витрины не входит в тариф данного заведения."
                  returnSlug={slug}
                />
              )}
            </LanguageProvider>
          </ModuleProvider>
        </UIConfigProvider>
      </ThemeProvider>
    );
  }

  // 4. Мобильное меню для гостей (/menu/:slug)
  return (
    <ThemeProvider initialTheme={restaurant.theme}>
      <UIConfigProvider customConfig={restaurant.ui_config || restaurant.theme?.ui_config}>
        <ModuleProvider enabledModules={enabledModules}>
          <LanguageProvider
            supportedLocales={restaurant.supported_locales || ['ru', 'en', 'tj']}
            defaultLocale={restaurant.default_locale || 'ru'}
          >
            <MobileFeed restaurantData={restaurantData} />
          </LanguageProvider>
        </ModuleProvider>
      </UIConfigProvider>
    </ThemeProvider>
  );
}

// Заглушка, если открыт URL неподключенного модуля (Zero-Coupling Graceful Fallback)
function ModuleDisabledScreen({ moduleTitle, description, returnSlug }) {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#090a0f',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center'
      }}
    >
      <div
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          backgroundColor: 'rgba(212, 175, 55, 0.1)',
          border: '1px solid var(--accent-gold)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '30px',
          marginBottom: '20px',
          boxShadow: '0 0 30px rgba(212, 175, 55, 0.2)'
        }}
      >
        🔒
      </div>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '30px', color: '#fff', margin: '0 0 10px' }}>
        {moduleTitle}
      </h2>
      <p style={{ color: '#94a3b8', maxWidth: '460px', lineHeight: '1.6', fontSize: '14px', margin: '0 0 28px' }}>
        {description}
      </p>
      <a
        href={`/menu/${returnSlug}`}
        style={{
          background: 'var(--accent-gold-gradient)',
          color: '#09090b',
          padding: '13px 28px',
          borderRadius: '14px',
          textDecoration: 'none',
          fontWeight: '700',
          fontSize: '14px',
          boxShadow: '0 4px 18px rgba(212, 175, 55, 0.35)',
          transition: 'transform 0.15s ease'
        }}
      >
        Открыть цифровое меню
      </a>
    </div>
  );
}
