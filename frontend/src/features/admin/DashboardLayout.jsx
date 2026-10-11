import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GoldButton } from '../../components/ui/GoldButton';
import { DishFormModal } from './DishFormModal';
import { ThemeCustomizer } from './ThemeCustomizer';
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
  AlertCircle
} from 'lucide-react';

export const DashboardLayout = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState('asr-royale');
  const [menuData, setMenuData] = useState(null);
  const [activeTab, setActiveTab] = useState('dishes'); // 'dishes' | 'categories' | 'theme' | 'preview'
  const [isDishModalOpen, setIsDishModalOpen] = useState(false);
  const [editingDish, setEditingDish] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  const loadMenu = async () => {
    setIsLoading(true);
    try {
      const res = await menuService.getFullMenu(selectedSlug, true); // true = include unavailable items for admin
      setMenuData(res);
    } catch (err) {
      console.error('Failed to load menu:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMenu();
  }, [selectedSlug]);

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

  const mobileUrl = `${window.location.origin}/menu/${selectedSlug}`;
  const kioskUrl = `${window.location.origin}/kiosk/${selectedSlug}`;

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
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '38px', fontWeight: '600', color: '#fff' }}>
            {restaurant?.name || 'ASR Maison Royale'}
          </h1>
        </div>

        {/* Action Buttons: Open Mobile & Open Kiosk */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
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

          <GoldButton
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => {
              setEditingDish(null);
              setIsDishModalOpen(true);
            }}
          >
            Добавить блюдо
          </GoldButton>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '28px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '12px'
        }}
      >
        {[
          { id: 'dishes', label: 'Позиции меню & Стоп-лист', icon: Utensils },
          { id: 'theme', label: 'Стиль & Kiosk Display', icon: Palette },
          { id: 'preview', label: 'QR-коды & Ссылки', icon: QrCode }
        ].map((tab) => {
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
                transition: 'all 0.2s ease'
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: DISHES & STOP-LIST */}
      {activeTab === 'dishes' && (
        <div>
          {/* Category Filter Pills */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
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
                cursor: 'pointer'
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
                  cursor: 'pointer'
                }}
              >
                {c.name?.ru || c.name?.en} ({c.dishes?.length || 0})
              </button>
            ))}
          </div>

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

                      {/* Name */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '15px' }}>
                          {dish.name?.ru || Object.values(dish.name)[0]}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {dish.name?.en} • {dish.weight || '300 г'}
                        </div>
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

      {/* TAB 2: THEME & KIOSK */}
      {activeTab === 'theme' && (
        <ThemeCustomizer
          restaurantSlug={selectedSlug}
          initialTheme={restaurant?.theme}
          onSaved={loadMenu}
        />
      )}

      {/* TAB 3: PREVIEW & QR */}
      {activeTab === 'preview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '32px' }}>
          {/* Mobile QR Card */}
          <GlassCard style={{ padding: '36px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', background: 'rgba(212, 175, 55, 0.15)', color: 'var(--accent-gold)', marginBottom: '16px' }}>
              <Smartphone size={32} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', marginBottom: '8px' }}>
              QR-код для столов и гостей
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
              Распечатайте этот QR-код для меню на столах или тейбл-тентах
            </p>

            <div style={{ display: 'inline-block', background: '#fff', padding: '16px', borderRadius: '20px', marginBottom: '20px' }}>
              <QRCodeSVG value={mobileUrl} size={200} level="H" />
            </div>

            <div>
              <a href={mobileUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                <GoldButton variant="outline" size="sm" icon={ExternalLink}>
                  Открыть меню в новой вкладке
                </GoldButton>
              </a>
            </div>
          </GlassCard>

          {/* Kiosk Display Info */}
          <GlassCard style={{ padding: '36px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', background: 'rgba(212, 175, 55, 0.15)', color: 'var(--accent-gold)', marginBottom: '16px' }}>
              <Tv size={32} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', marginBottom: '8px' }}>
              Уличная интерактивная витрина
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
              Запустите этот URL на уличных планшетах, тотемах или сенсорных панелях в режиме Kiosk
            </p>

            <div style={{ padding: '20px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '24px', wordBreak: 'break-all', fontSize: '14px', color: 'var(--accent-gold)' }}>
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
        </div>
      )}

      {/* Dish Form Modal */}
      {isDishModalOpen && (
        <DishFormModal
          restaurantId={restaurant?.id || 1}
          categories={categories}
          dishToEdit={editingDish}
          onClose={() => {
            setIsDishModalOpen(false);
            setEditingDish(null);
          }}
          onSaved={() => {
            setIsDishModalOpen(false);
            setEditingDish(null);
            loadMenu();
          }}
        />
      )}
    </div>
  );
};
