import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GoldButton } from '../../components/ui/GoldButton';
import { DishFormModal } from './DishFormModal';
import { CreateRestaurantModal } from './CreateRestaurantModal';
import { CategoryManager } from './CategoryManager';
import { ThemeCustomizer } from './ThemeCustomizer';
import { RestaurantSettings } from './RestaurantSettings';
import { AdminLogin } from './AdminLogin';
import { TableQrGenerator } from './TableQrGenerator';
import { UIConfigManager } from './UIConfigManager';
import { ReservationManager } from './ReservationManager';
import { useUI } from '../../context/UIConfigContext';
import { menuService } from '../../services/menuService';
import { QRCodeSVG } from 'qrcode.react';
import {
  Utensils,
  Plus,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  Layers,
  Palette,
  QrCode,
  Smartphone,
  Tv,
  CheckCircle,
  AlertCircle,
  FolderPlus,
  LogOut,
  Building2,
  Bell,
  CheckCheck,
  Clock,
  Receipt,
  ShoppingBag,
  Sliders,
  Calendar,
  ChefHat
} from 'lucide-react';


export const DashboardLayout = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    Boolean(sessionStorage.getItem('admin_session_token'))
  );
  const [restaurants, setRestaurants] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState('asr-royale');
  const [menuData, setMenuData] = useState(null);
  const [activeTab, setActiveTab] = useState('dishes'); // 'dishes' | 'categories' | 'theme' | 'preview'
  const [isDishModalOpen, setIsDishModalOpen] = useState(false);
  const [isCreateRestaurantOpen, setIsCreateRestaurantOpen] = useState(false);
  const [editingDish, setEditingDish] = useState(null);
  const [initialCategoryId, setInitialCategoryId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // Smart Table Service Requests & Reservations
  const [serviceRequests, setServiceRequests] = useState([]);
  const [serviceFilter, setServiceFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'COMPLETED'
  const [pendingReservationsCount, setPendingReservationsCount] = useState(0);

  const loadServiceRequests = async () => {
    try {
      const data = await menuService.getServiceRequests(selectedSlug);
      setServiceRequests(data || []);
    } catch (_) {}
  };

  const loadPendingReservationsCount = async () => {
    try {
      const data = await menuService.getAdminReservations(selectedSlug, null, 'PENDING');
      setPendingReservationsCount(Array.isArray(data) ? data.length : 0);
    } catch (_) {}
  };

  const loadMenu = async () => {
    setIsLoading(true);
    try {
      const res = await menuService.getFullMenu(selectedSlug, true); // true = include unavailable items for admin
      setMenuData(res);
      await loadServiceRequests();
      await loadPendingReservationsCount();
    } catch (err) {
      console.error('Failed to load menu:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRestaurants = async () => {
    try {
      const data = await menuService.getRestaurants();
      if (Array.isArray(data) && data.length > 0) {
        setRestaurants(data);
      }
    } catch (err) {
      console.error('Failed to load restaurants list:', err);
    }
  };

  useEffect(() => {
    loadRestaurants();
  }, []);

  useEffect(() => {
    loadMenu();
    // Poll service requests & pending reservations every 6 seconds
    const interval = setInterval(() => {
      loadServiceRequests();
      loadPendingReservationsCount();
    }, 6000);
    return () => clearInterval(interval);
  }, [selectedSlug]);

  // Synchronize CSS variables when switching restaurant theme
  useEffect(() => {
    if (restaurant?.theme_config?.colors) {
      const colors = restaurant.theme_config.colors;
      const root = document.documentElement;
      if (colors.background) root.style.setProperty('--bg-core', colors.background);
      if (colors.primary_accent) root.style.setProperty('--accent-gold', colors.primary_accent);
      if (colors.text_primary) root.style.setProperty('--text-main', colors.text_primary);
    }
  }, [restaurant]);

  const handleToggleStopList = async (dishId) => {
    try {
      await menuService.toggleStopList(dishId);
      loadMenu();
    } catch (err) {
      alert('Ошибка переключения стоп-листа: ' + err.message);
    }
  };

  const handleDeleteDish = async (dishId) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту позицию?')) return;
    try {
      await menuService.deleteDish(dishId);
      loadMenu();
    } catch (err) {
      alert('Ошибка при удалении: ' + err.message);
    }
  };

  const restaurant = menuData?.restaurant;
  const categories = menuData?.categories || [];

  // All dishes combined for admin table
  const allDishes = categories.flatMap((c) =>
    c.dishes.map((d) => ({ ...d, categoryName: c.name?.ru || c.name?.en }))
  );

  const filteredDishes = selectedCategoryFilter === 'all'
    ? allDishes
    : allDishes.filter((d) => d.category_id === parseInt(selectedCategoryFilter, 10));

  const pendingRequestsCount = serviceRequests.filter((r) => r.status === 'PENDING').length;

  const handleResolveServiceRequest = async (reqId) => {
    try {
      await menuService.updateServiceRequestStatus(selectedSlug, reqId, 'COMPLETED');
      loadServiceRequests();
    } catch (err) {
      alert('Ошибка обновления статуса: ' + err.message);
    }
  };

  const mobileUrl = `${window.location.origin}/menu/${selectedSlug}`;
  const kioskUrl = `${window.location.origin}/kiosk/${selectedSlug}`;
  const kdsUrl = `${window.location.origin}/kds/${selectedSlug}`;

  const handleLogout = async () => {
    await menuService.logoutAdmin();
    setIsAuthenticated(false);
  };

  const ui = useUI();
  const effectiveUI = restaurant?.theme_config?.ui_config || restaurant?.ui_config || ui || {};
  const adminTabsUI = effectiveUI?.admin_tabs || {};

  const AVAILABLE_TABS = [
    { id: 'dishes', label: 'Позиции меню & Стоп-лист', icon: Utensils, count: allDishes.length, enabled: adminTabsUI.show_dishes_tab !== false },
    { id: 'reservations', label: 'Бронирование столов', icon: Calendar, count: pendingReservationsCount, highlight: pendingReservationsCount > 0, enabled: adminTabsUI.show_reservations_tab !== false },
    { id: 'service_requests', label: 'Вызовы & Заказы', icon: Bell, count: pendingRequestsCount, highlight: pendingRequestsCount > 0, enabled: adminTabsUI.show_service_requests_tab !== false },
    { id: 'ui_config', label: 'Конструктор UI', icon: Sliders, enabled: adminTabsUI.show_ui_config_tab !== false },
    { id: 'categories', label: 'Управление разделами', icon: Layers, count: categories.length, enabled: adminTabsUI.show_categories_tab !== false },
    { id: 'settings', label: 'Настройки заведения', icon: Building2, enabled: adminTabsUI.show_settings_tab !== false },
    { id: 'theme', label: 'Стиль & Kiosk Display', icon: Palette, enabled: adminTabsUI.show_theme_tab !== false },
    { id: 'preview', label: 'QR-коды & Ссылки', icon: QrCode, enabled: adminTabsUI.show_preview_tab !== false }
  ].filter((tab) => tab.enabled);

  useEffect(() => {
    if (AVAILABLE_TABS.length > 0 && !AVAILABLE_TABS.some((t) => t.id === activeTab)) {
      setActiveTab(AVAILABLE_TABS[0].id);
    }
  }, [adminTabsUI, activeTab, AVAILABLE_TABS]);

  if (!isAuthenticated) {
    return (
      <AdminLogin
        restaurantSlug={selectedSlug}
        onAuthenticated={() => {
          setIsAuthenticated(true);
          loadMenu();
        }}
      />
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-core)',
        color: 'var(--text-main)',
        padding: '32px 40px'
      }}
    >
      {/* Top Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '20px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-gold)', fontSize: '13px', fontWeight: '700', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '6px' }}>
            <Utensils size={16} />
            <span>Панель Управления Рестораном</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <h1
              onClick={() => setActiveTab('settings')}
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '38px',
                fontWeight: '600',
                color: '#fff',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                margin: 0
              }}
              title="Нажмите, чтобы изменить название и настройки заведения"
            >
              <span>{restaurant?.name || 'ASR Maison Royale'}</span>
              <span style={{ fontSize: '13px', color: 'var(--accent-gold)', opacity: 0.8, backgroundColor: 'rgba(212, 175, 55, 0.12)', border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: '20px', padding: '2px 8px' }}>
                изменить
              </span>
            </h1>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              {restaurants.length > 0 && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.04)', padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(212,175,55,0.2)' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Заведение:</span>
                  <select
                    value={selectedSlug}
                    onChange={(e) => setSelectedSlug(e.target.value)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--accent-gold)',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                    title="Быстрое переключение между заведениями сети"
                  >
                    {restaurants.map((r) => (
                      <option key={r.slug} value={r.slug} style={{ background: '#121216', color: '#fff' }}>
                        🏛️ {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={() => setIsCreateRestaurantOpen(true)}
                style={{
                  background: 'rgba(212, 175, 55, 0.12)',
                  border: '1px solid rgba(212, 175, 55, 0.4)',
                  color: 'var(--accent-gold)',
                  borderRadius: '10px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
                title="Создать новый ресторан или филиал сети (Франшиза)"
              >
                <Building2 size={13} />
                <span>+ Филиал</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons: Open Mobile & Open Kiosk */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <a
            href={mobileUrl}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: 'none' }}
          >
            <GoldButton variant="outline" size="sm" icon={Smartphone}>
              Открыть меню гостя
            </GoldButton>
          </a>

          <a
            href={kioskUrl}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: 'none' }}
          >
            <GoldButton variant="outline" size="sm" icon={Tv}>
              Открыть уличный экран
            </GoldButton>
          </a>

          <a
            href={kdsUrl}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: 'none' }}
          >
            <GoldButton variant="outline" size="sm" icon={ChefHat}>
              Экран кухни (KDS)
            </GoldButton>
          </a>

          <GoldButton
            variant="outline"
            size="sm"
            icon={Building2}
            onClick={() => setActiveTab('settings')}
          >
            Настройки заведения
          </GoldButton>

          <GoldButton
            variant="outline"
            size="sm"
            icon={Layers}
            onClick={() => setActiveTab('categories')}
          >
            Разделы ({categories.length})
          </GoldButton>

          <GoldButton
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => {
              setEditingDish(null);
              setInitialCategoryId(null);
              setIsDishModalOpen(true);
            }}
          >
            Добавить блюдо
          </GoldButton>

          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#ef4444',
              borderRadius: '12px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
            title="Выйти из админ-панели"
          >
            <LogOut size={16} />
            <span>Выйти</span>
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '28px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '12px',
          overflowX: 'auto'
        }}
      >
        {AVAILABLE_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: isActive ? 'rgba(212, 175, 55, 0.12)' : 'transparent',
                color: isActive ? 'var(--accent-gold)' : 'var(--text-muted)',
                border: isActive ? '1px solid var(--glass-border)' : '1px solid transparent',
                borderRadius: '12px',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: isActive ? '600' : '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  style={{
                    backgroundColor: tab.highlight
                      ? '#ef4444'
                      : isActive
                      ? 'var(--accent-gold)'
                      : 'rgba(255, 255, 255, 0.08)',
                    color: tab.highlight
                      ? '#fff'
                      : isActive
                      ? '#09090b'
                      : 'var(--text-muted)',
                    borderRadius: '10px',
                    padding: '2px 8px',
                    fontSize: '11px',
                    fontWeight: '700',
                    boxShadow: tab.highlight ? '0 0 10px rgba(239, 68, 68, 0.4)' : 'none'
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: DISHES & STOP-LIST */}
      {activeTab === 'dishes' && (
        <div>
          {/* Category Filter Pills & Add Section Button */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px', alignItems: 'center' }}>
            <button
              onClick={() => setSelectedCategoryFilter('all')}
              style={{
                background: selectedCategoryFilter === 'all' ? 'var(--accent-gold)' : 'rgba(255,255,255,0.06)',
                color: selectedCategoryFilter === 'all' ? '#09090b' : 'var(--text-main)',
                border: 'none',
                borderRadius: '20px',
                padding: '6px 16px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Все разделы ({allDishes.length})
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategoryFilter(String(c.id))}
                style={{
                  background: selectedCategoryFilter === String(c.id) ? 'var(--accent-gold)' : 'rgba(255,255,255,0.06)',
                  color: selectedCategoryFilter === String(c.id) ? '#09090b' : 'var(--text-main)',
                  border: 'none',
                  borderRadius: '20px',
                  padding: '6px 16px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {c.name?.ru || c.name?.en} ({c.dishes?.length || 0})
              </button>
            ))}

            {/* Quick button to manage categories */}
            <button
              onClick={() => setActiveTab('categories')}
              title="Перейти к управлению разделами"
              style={{
                background: 'rgba(212, 175, 55, 0.08)',
                color: 'var(--accent-gold)',
                border: '1px dashed rgba(212, 175, 55, 0.4)',
                borderRadius: '20px',
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                marginLeft: '4px'
              }}
            >
              <FolderPlus size={14} />
              <span>+ Настроить разделы ({categories.length})</span>
            </button>
          </div>

          {/* Empty categories warning in dishes tab */}
          {categories.length === 0 && (
            <GlassCard style={{ padding: '36px', textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ color: 'var(--accent-gold)', marginBottom: '12px' }}>
                <Layers size={36} style={{ margin: '0 auto' }} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#fff', marginBottom: '8px' }}>
                Сначала создайте разделы меню
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '420px', margin: '0 auto 20px' }}>
                Перед добавлением позиций необходимо создать структуру разделов кухни или бара.
              </p>
              <GoldButton
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => setActiveTab('categories')}
              >
                Создать раздел
              </GoldButton>
            </GlassCard>
          )}

          {/* Dishes Table */}
          <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '16px 20px', fontWeight: '600' }}>Медиа</th>
                    <th style={{ padding: '16px 20px', fontWeight: '600' }}>Название блюда</th>
                    <th style={{ padding: '16px 20px', fontWeight: '600' }}>Раздел</th>
                    <th style={{ padding: '16px 20px', fontWeight: '600' }}>Цена</th>
                    <th style={{ padding: '16px 20px', fontWeight: '600' }}>Стоп-лист (Наличие)</th>
                    <th style={{ padding: '16px 20px', fontWeight: '600', textAlign: 'right' }}>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDishes.map((dish) => (
                    <tr
                      key={dish.id}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        backgroundColor: !dish.is_available ? 'rgba(239, 68, 68, 0.04)' : 'transparent',
                        transition: 'background 0.2s ease'
                      }}
                    >
                      {/* Media preview */}
                      <td style={{ padding: '14px 20px' }}>
                        <div
                          style={{
                            width: '50px',
                            height: '70px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            backgroundColor: '#16161e',
                            position: 'relative'
                          }}
                        >
                          {dish.media?.video_mobile ? (
                            <video
                              src={dish.media.video_mobile}
                              autoPlay
                              loop
                              muted
                              playsInline
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: '10px' }}>
                              No Vid
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Name & Badges */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '15px' }}>
                          {dish.name?.ru || Object.values(dish.name)[0]}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {dish.name?.en} • {dish.weight || '300 г'}
                        </div>
                        {dish.badges && dish.badges.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                            {dish.badges.map((b, i) => (
                              <span key={i} style={{ background: 'rgba(212,175,55,0.15)', color: 'var(--accent-gold)', borderRadius: '10px', padding: '1px 7px', fontSize: '10px', fontWeight: '700' }}>
                                {b}
                              </span>
                            ))}
                          </div>
                        )}
                        {dish.modifiers && dish.modifiers.length > 0 && (
                          <div style={{ fontSize: '10px', color: '#38bdf8', marginTop: '3px' }}>
                            🥩 {dish.modifiers.length} групп(ы) модификаторов
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td style={{ padding: '14px 20px', color: 'var(--text-muted)' }}>
                        {dish.categoryName}
                      </td>

                      {/* Price */}
                      <td style={{ padding: '14px 20px', fontWeight: '700', color: 'var(--accent-gold)' }}>
                        {dish.price} {dish.currency}
                      </td>

                      {/* 1-Tap Stop-list toggle */}
                      <td style={{ padding: '14px 20px' }}>
                        <button
                          onClick={() => handleToggleStopList(dish.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: dish.is_available ? '#10b981' : '#ef4444',
                            fontWeight: '600',
                            fontSize: '13px'
                          }}
                        >
                          {dish.is_available ? (
                            <>
                              <ToggleRight size={26} />
                              <span>В наличии</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft size={26} />
                              <span style={{ color: '#ef4444' }}>В стоп-листе</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            onClick={() => {
                              setEditingDish(dish);
                              setIsDishModalOpen(true);
                            }}
                            style={{
                              background: 'rgba(255,255,255,0.06)',
                              border: 'none',
                              color: 'var(--text-main)',
                              padding: '8px',
                              borderRadius: '8px',
                              cursor: 'pointer'
                            }}
                            title="Редактировать"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteDish(dish.id)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: 'none',
                              color: '#ef4444',
                              padding: '8px',
                              borderRadius: '8px',
                              cursor: 'pointer'
                            }}
                            title="Удалить"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {/* TAB 2: CATEGORIES MANAGEMENT */}
      {activeTab === 'categories' && (
        <CategoryManager
          restaurantId={restaurant?.id}
          categories={categories}
          onCategoriesChanged={loadMenu}
          onAddDishToCategory={(catId) => {
            setInitialCategoryId(catId);
            setEditingDish(null);
            setIsDishModalOpen(true);
          }}
          onViewDishesOfCategory={(catId) => {
            setSelectedCategoryFilter(String(catId));
            setActiveTab('dishes');
          }}
        />
      )}

      {/* TAB 3: RESTAURANT PROFILE & BRANDING SETTINGS */}
      {activeTab === 'settings' && (
        <RestaurantSettings
          restaurant={restaurant}
          onRestaurantUpdated={(updated) => {
            if (updated?.slug && updated.slug !== selectedSlug) {
              setSelectedSlug(updated.slug);
            }
            loadMenu();
          }}
        />
      )}

      {/* TAB 4: THEME & KIOSK */}
      {activeTab === 'theme' && (
        <ThemeCustomizer
          restaurantSlug={selectedSlug}
          initialTheme={restaurant?.theme}
          onSaved={loadMenu}
        />
      )}

      {/* TAB: UI CONFIG MANAGER */}
      {activeTab === 'ui_config' && (
        <UIConfigManager
          restaurantSlug={selectedSlug}
          initialConfig={restaurant?.ui_config || restaurant?.theme?.ui_config}
          onSaved={loadMenu}
        />
      )}

      {/* TAB 3: PREVIEW & QR */}
      {activeTab === 'preview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Table Specific QR Code Generator with Print Support */}
          <TableQrGenerator 
            restaurant={restaurant} 
            availableTables={restaurant?.available_tables || []} 
          />

          {/* Additional Displays & General Links */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }} className="no-print">
            {/* General Restaurant QR Card (For entrance/Instagram) */}
            <GlassCard style={{ padding: '28px', textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', background: 'rgba(212, 175, 55, 0.15)', color: 'var(--accent-gold)', marginBottom: '16px' }}>
                <Smartphone size={28} />
              </div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', marginBottom: '8px' }}>
                Общий QR-код заведения
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                Для размещения на входе, в Instagram, буклетах и рекламе (без привязки к конкретному столу)
              </p>

              <div style={{ display: 'inline-block', background: '#fff', padding: '14px', borderRadius: '16px', marginBottom: '18px' }}>
                <QRCodeSVG value={mobileUrl} size={160} level="H" />
              </div>

              <div>
                <a href={mobileUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                  <GoldButton variant="outline" size="sm" icon={ExternalLink}>
                    Открыть общее меню
                  </GoldButton>
                </a>
              </div>
            </GlassCard>

            {/* Kiosk Display Info */}
            <GlassCard style={{ padding: '28px', textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', background: 'rgba(212, 175, 55, 0.15)', color: 'var(--accent-gold)', marginBottom: '16px' }}>
                <Tv size={28} />
              </div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', marginBottom: '8px' }}>
                Уличная интерактивная витрина
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                Для запуска на уличных сенсорных тотемах, планшетах у входа или экранах в режиме Kiosk
              </p>

              <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '20px', wordBreak: 'break-all', fontSize: '13px', color: 'var(--accent-gold)' }}>
                {kioskUrl}
              </div>

              <div>
                <a href={kioskUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                  <GoldButton variant="primary" size="sm" icon={Tv}>
                    Запустить Kiosk экран
                  </GoldButton>
                </a>
              </div>
            </GlassCard>

            {/* KDS Kitchen Tablet Info */}
            <GlassCard style={{ padding: '28px', textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', marginBottom: '16px' }}>
                <ChefHat size={28} />
              </div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', marginBottom: '8px' }}>
                Кухонный экран шефа (KDS)
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                Для установки на планшетах раздачи кухни, горячего/холодного цеха или бара
              </p>

              <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '20px', wordBreak: 'break-all', fontSize: '13px', color: '#10b981' }}>
                {kdsUrl}
              </div>

              <div>
                <a href={kdsUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                  <GoldButton variant="primary" size="sm" icon={ChefHat}>
                    Открыть монитор кухни
                  </GoldButton>
                </a>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* TAB 6: SERVICE REQUESTS (SMART TABLE SERVICE) */}
      {activeTab === 'service_requests' && (
        <div>
          {/* Header & Filter Pills */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { id: 'ALL', label: 'Все вызовы' },
                { id: 'PENDING', label: `Ожидают (${pendingRequestsCount})` },
                { id: 'COMPLETED', label: 'Выполненные' }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setServiceFilter(f.id)}
                  style={{
                    background: serviceFilter === f.id ? 'var(--accent-gold)' : 'rgba(255,255,255,0.06)',
                    color: serviceFilter === f.id ? '#09090b' : '#fff',
                    border: 'none',
                    borderRadius: '20px',
                    padding: '6px 16px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              onClick={loadServiceRequests}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--accent-gold)',
                borderRadius: '10px',
                padding: '8px 14px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Обновить список
            </button>
          </div>

          <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
            {serviceRequests.filter((r) => serviceFilter === 'ALL' || r.status === serviceFilter).length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Bell size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p style={{ fontSize: '16px', color: '#fff', marginBottom: '4px' }}>Нет активных вызовов от гостей</p>
                <p style={{ fontSize: '13px' }}>Здесь будут мгновенно появляться вызовы официанта, счета и заказы со столов</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '16px 20px' }}>Стол</th>
                    <th style={{ padding: '16px 20px' }}>Тип запроса</th>
                    <th style={{ padding: '16px 20px' }}>Детали / Заказ гостя</th>
                    <th style={{ padding: '16px 20px' }}>Время</th>
                    <th style={{ padding: '16px 20px' }}>Статус</th>
                    <th style={{ padding: '16px 20px', textAlign: 'right' }}>Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceRequests
                    .filter((r) => serviceFilter === 'ALL' || r.status === serviceFilter)
                    .map((req) => (
                      <tr key={req.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', backgroundColor: req.status === 'PENDING' ? 'rgba(212,175,55,0.05)' : 'transparent' }}>
                        <td style={{ padding: '16px 20px', fontWeight: '800', fontSize: '16px', color: 'var(--accent-gold)' }}>
                          №{req.table_number}
                        </td>
                        <td style={{ padding: '16px 20px', fontWeight: '600' }}>
                          {req.request_type === 'call_waiter' && '🛎️ Вызов официанта'}
                          {req.request_type === 'call_sommelier' && '🍷 Вызов сомелье'}
                          {req.request_type === 'call_hookah' && '💨 Вызов кальянного мастера'}
                          {req.request_type === 'call_admin' && '👔 Вызов администратора'}
                          {req.request_type === 'request_bill_card' && '💳 Счёт (Карта)'}
                          {req.request_type === 'request_bill_cash' && '💵 Счёт (Наличные)'}
                          {(req.request_type === 'order' || req.request_type === 'repeat_order') && (
                            req.guest_comment?.includes('ДОЗАКАЗ') ? (
                              <span style={{ color: 'var(--accent-gold)', display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(212,175,55,0.15)', padding: '3px 8px', borderRadius: '8px' }}>
                                🔁 Дозаказ гостя
                              </span>
                            ) : (
                              '🛒 Заказ гостя'
                            )
                          )}
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          {req.cart_items && req.cart_items.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {req.cart_items.map((item, iIdx) => (
                                <div key={iIdx} style={{ fontSize: '13px', color: '#fff', lineHeight: '1.4' }}>
                                  <b>{item.quantity}x</b> {item.name} ({item.price} {item.currency})
                                  {item.course && item.course !== 'По готовности кухни' && (
                                    <span style={{ backgroundColor: 'rgba(212, 175, 55, 0.15)', color: 'var(--accent-gold)', padding: '1px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', marginLeft: '6px' }}>
                                      {item.course}
                                    </span>
                                  )}
                                  {item.chosen_options?.length > 0 && (
                                    <span style={{ color: '#fbbf24', marginLeft: '6px', fontSize: '12px' }}>
                                      [{item.chosen_options.map((o) => o.name).join(', ')}]
                                    </span>
                                  )}
                                  {item.comment && (
                                    <span style={{ color: '#94a3b8', fontSize: '12px', marginLeft: '6px', fontStyle: 'italic' }}>
                                      ({item.comment})
                                    </span>
                                  )}
                                </div>
                              ))}
                              {req.guest_comment && (
                                <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', marginTop: '2px' }}>
                                  «{req.guest_comment}»
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>{req.guest_comment || '—'}</span>
                          )}
                        </td>
                        <td style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px' }}>
                          {req.created_at ? new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span
                            style={{
                              backgroundColor: req.status === 'PENDING' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                              color: req.status === 'PENDING' ? '#ef4444' : '#10b981',
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: '700'
                            }}
                          >
                            {req.status === 'PENDING' ? 'Ожидает' : 'Выполнен'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          {req.status === 'PENDING' && (
                            <button
                              onClick={() => handleResolveServiceRequest(req.id)}
                              style={{
                                backgroundColor: 'var(--accent-gold)',
                                border: 'none',
                                color: '#09090b',
                                borderRadius: '8px',
                                padding: '6px 14px',
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                            >
                              Выполнено
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </GlassCard>
        </div>
      )}

      {/* TAB: TABLE RESERVATIONS (DISPATCHER & MANAGEMENT) */}
      {activeTab === 'reservations' && (
        <ReservationManager restaurantSlug={selectedSlug} />
      )}

      {/* Dish Form Modal */}
      {isDishModalOpen && (
        <DishFormModal
          restaurantId={restaurant?.id}
          defaultCurrency={restaurant?.currency || 'TJS'}
          categories={categories}
          dishToEdit={editingDish}
          initialCategoryId={initialCategoryId}
          supportedLocales={restaurant?.supported_locales || ['ru', 'tj', 'en']}
          onClose={() => {
            setIsDishModalOpen(false);
            setEditingDish(null);
            setInitialCategoryId(null);
          }}
          onSaved={() => {
            setIsDishModalOpen(false);
            setEditingDish(null);
            setInitialCategoryId(null);
            loadMenu();
          }}
        />
      )}

      {/* Create Restaurant Modal */}
      {isCreateRestaurantOpen && (
        <CreateRestaurantModal
          existingRestaurants={restaurants}
          onClose={() => setIsCreateRestaurantOpen(false)}
          onCreated={(newRest) => {
            setIsCreateRestaurantOpen(false);
            loadRestaurants();
            if (newRest?.slug) {
              setSelectedSlug(newRest.slug);
            }
          }}
        />
      )}
    </div>
  );
};
