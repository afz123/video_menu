import React, { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GoldButton } from '../../components/ui/GoldButton';
import { menuService } from '../../services/menuService';
import { Check, ShieldCheck, Zap, Lock, Sparkles, CheckCircle2 } from 'lucide-react';

// 1. ПАКЕТНЫЕ ТАРИФЫ СО СКИДКОЙ
const BUNDLE_TIERS = [
  {
    id: 'tier_start',
    name: '🥉 Старт (Витрина)',
    price: 2000,
    priceStr: '2 000 сомони/мес',
    originalPriceStr: null,
    badge: 'Базовый',
    badgeColor: '#94a3b8',
    modules: ['menu'],
    desc: 'Цифровое Reels-видеоменю, QR-коды для столов, ASMR-звук, 3 языка и стоп-лист.'
  },
  {
    id: 'tier_business',
    name: '🥈 Бизнес & Зал',
    price: 3000,
    priceStr: '3 000 сомони/мес',
    originalPriceStr: '3 500 сомони',
    badge: 'Хит продаж',
    badgeColor: 'var(--accent-gold)',
    modules: ['menu', 'ordering', 'service_dispatch', 'guest_finance'],
    desc: 'Меню + заказы гостя по курсам (1, 2, 3) + вызовы официанта в Telegram + умный сплит-чек и чаевые.'
  },
  {
    id: 'tier_premium',
    name: '🥇 Премиум Всё Включено',
    price: 4200,
    priceStr: '4 200 сомони/мес',
    originalPriceStr: '5 000 сомони',
    badge: 'Максимальная выгода (-800 смн)',
    badgeColor: '#10b981',
    modules: ['menu', 'ordering', 'service_dispatch', 'guest_finance', 'reservations', 'kiosk', 'kds'],
    desc: 'Полный комплекс: Зал + 3D-бронирование столов + Уличный Киоск + Кухонный монитор шефа (KDS).'
  }
];

// 2. ПОШТУЧНАЯ СЕТКА МОДУЛЕЙ (2000 смн база + 500 смн за каждый доп)
const PACKAGES = [
  {
    id: 'menu',
    name: '1. Core Digital Video Menu',
    price: 2000,
    priceStr: '2 000 смн/мес',
    badge: 'Ядро системы',
    desc: 'Вертикальная видеолента Reels, ASMR-звук, постеры WebP, мультиязычность (RU/EN/TJ), стоп-лист в 1 клик.',
    required: true
  },
  {
    id: 'ordering',
    name: '2. Smart Ordering & Courses',
    price: 500,
    priceStr: '+500 смн/мес',
    badge: 'Заказы & Курсы',
    desc: 'Корзина гостя, выбор курсов подачи (Курс 1, 2, 3), модификаторы (прожарка, соусы), отправка чека в зал.'
  },
  {
    id: 'service_dispatch',
    name: '3. Staff Dispatcher & Telegram',
    price: 500,
    priceStr: '+500 смн/мес',
    badge: 'Сервис залов',
    desc: 'Вызов официанта, сомелье, кальянщика, управляющего, запрос счета (карта/наличные), Telegram-бот для смены.'
  },
  {
    id: 'guest_finance',
    name: '4. Split-Bill & Tips Fintech',
    price: 500,
    priceStr: '+500 смн/мес',
    badge: 'Fintech & Чаевые',
    desc: 'Калькулятор сплита счета на 1–6 персон, попозиционный расчет «Кто что ел + общий стол», чаевые официантам.'
  },
  {
    id: 'reservations',
    name: '5. Spatial Booking & 3D Floor Plan',
    price: 500,
    priceStr: '+500 смн/мес',
    badge: 'Бронирование & Залы',
    desc: 'Онлайн-бронь столов, фото-карта зала с этажами (1F, 2F), шахматка для хостес, Pacing кухни, защита от овербукинга.'
  },
  {
    id: 'kiosk',
    name: '6. Outdoor Smart Kiosk Mode',
    price: 500,
    priceStr: '+500 смн/мес',
    badge: 'Уличная витрина',
    desc: 'Уличный сенсорный экран, рекламный Attract-режим, сброс ПДн по таймеру 45с, QR-мост на телефон гостя.'
  },
  {
    id: 'kds',
    name: '7. Kitchen Display System (KDS)',
    price: 500,
    priceStr: '+500 смн/мес',
    badge: 'Кухня & Повара',
    desc: 'Кухонный монитор раздачи поваров, тайминг готовки (SLA), звуковой гонг, пуш официанту «Блюдо готово на раздаче».'
  }
];

export const LicenseModuleManager = ({ restaurant, onSaved }) => {
  const [enabledModules, setEnabledModules] = useState(
    restaurant?.enabled_modules || ['menu', 'ordering', 'service_dispatch', 'guest_finance', 'reservations', 'kiosk', 'kds']
  );
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const toggleModule = (modId) => {
    if (modId === 'menu') return; // Core нельзя выключить
    setEnabledModules((prev) =>
      prev.includes(modId) ? prev.filter((m) => m !== modId) : [...prev, modId]
    );
  };

  const handleSelectAll = () => {
    setEnabledModules(PACKAGES.map((p) => p.id));
  };

  const handleSelectCoreOnly = () => {
    setEnabledModules(['menu']);
  };

  // Расчет стоимости с учетом пакетных скидок
  const calculateTotal = () => {
    const activeCount = enabledModules.length;
    // Проверяем точное совпадение с пакетными тарифами
    if (activeCount === 7) return 4200; // Пакет Премиум со скидкой
    if (
      activeCount === 4 &&
      ['menu', 'ordering', 'service_dispatch', 'guest_finance'].every((m) => enabledModules.includes(m))
    ) {
      return 3000; // Пакет Бизнес со скидкой
    }
    if (activeCount === 1 && enabledModules.includes('menu')) {
      return 2000; // Базовый
    }
    // Поштучный расчет (2000 база + по 500 за каждый включенный)
    const extraCount = enabledModules.filter((m) => m !== 'menu').length;
    return 2000 + extraCount * 500;
  };

  const totalMonthly = calculateTotal();

  const handleApplyTier = (tierModules) => {
    setEnabledModules(tierModules);
  };

  const handleSave = async () => {
    if (!restaurant?.slug) return;
    setIsSaving(true);
    try {
      await menuService.updateRestaurant(restaurant.slug, {
        enabled_modules: enabledModules
      });

      // Очистка локального SWR-кеша для мгновенного применения на клиентах
      if (typeof window !== 'undefined') {
        try {
          Object.keys(localStorage).forEach((key) => {
            if (key.startsWith('luxury_menu_cache_')) {
              localStorage.removeItem(key);
            }
          });
        } catch (_) { }
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3500);
      if (onSaved) onSaved();
    } catch (err) {
      alert('Ошибка обновления коммерческой лицензии: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <GlassCard style={{ padding: '32px' }}>
      {/* Header with Title and Total */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '20px'
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--accent-gold)',
              fontSize: '13px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            <ShieldCheck size={18} />
            <span>Коммерческие модули & Лицензия (Feature Packaging)</span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '30px', color: '#fff', margin: '6px 0 2px' }}>
            Пакет подключенных модулей
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0, maxWidth: '640px', lineHeight: '1.5' }}>
            Архитектура Zero-Coupling: если модуль отключен, клиентские кнопки, модальные окна и роуты изолируются без белого экрана и без ошибок в консоли.
          </p>
        </div>

        {/* Pricing & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div
            style={{
              backgroundColor: 'rgba(212, 175, 55, 0.1)',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              borderRadius: '14px',
              padding: '10px 18px',
              textAlign: 'right'
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Тариф заведения
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--accent-gold)', fontFamily: 'var(--font-sans)' }}>
              {totalMonthly.toLocaleString()} <span style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>сомони</span>
              <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-muted)' }}> / месяц</span>
            </div>
          </div>

          <GoldButton
            variant="primary"
            icon={Check}
            disabled={isSaving}
            onClick={handleSave}
            style={{ padding: '12px 24px', fontSize: '14px', fontWeight: '700' }}
          >
            {isSaving ? 'Сохранение...' : 'Сохранить тариф'}
          </GoldButton>
        </div>
      </div>

      {/* 3 ПАКЕТНЫХ ТАРИФА ДЛЯ КЛИЕНТА */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
          ✨ Выберите готовый пакет или настройте модули поштучно ниже:
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {BUNDLE_TIERS.map((tier) => {
            const isTierActive =
              tier.modules.length === enabledModules.length &&
              tier.modules.every((m) => enabledModules.includes(m));

            return (
              <div
                key={tier.id}
                onClick={() => handleApplyTier(tier.modules)}
                style={{
                  backgroundColor: isTierActive ? 'rgba(212, 175, 55, 0.14)' : 'rgba(255, 255, 255, 0.03)',
                  border: isTierActive ? '2px solid var(--accent-gold)' : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '20px',
                  padding: '20px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: isTierActive ? '0 8px 30px rgba(212, 175, 55, 0.25)' : 'none',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: tier.badgeColor, backgroundColor: 'rgba(0,0,0,0.4)', padding: '2px 8px', borderRadius: '6px' }}>
                      {tier.badge}
                    </span>
                    {tier.originalPriceStr && (
                      <span style={{ fontSize: '12px', color: '#94a3b8', textDecoration: 'line-through' }}>
                        {tier.originalPriceStr}
                      </span>
                    )}
                  </div>

                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', margin: '4px 0 6px' }}>
                    {tier.name}
                  </h3>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent-gold)', marginBottom: '10px' }}>
                    {tier.priceStr}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
                    {tier.desc}
                  </p>
                </div>

                <button
                  type="button"
                  style={{
                    marginTop: '16px',
                    width: '100%',
                    background: isTierActive ? 'var(--accent-gold-gradient)' : 'rgba(255,255,255,0.06)',
                    color: isTierActive ? '#000' : '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {isTierActive ? '✓ Пакет активен' : 'Подключить этот пакет'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Select Preset Buttons & Notification */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={handleSelectAll}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '10px',
              padding: '7px 14px',
              color: '#fff',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            ✨ Выбрать все 7 модулей (Enterprise)
          </button>
          <button
            type="button"
            onClick={handleSelectCoreOnly}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '10px',
              padding: '7px 14px',
              color: '#fff',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Только базовое меню (2 000 смн)
          </button>
        </div>

        {success && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid #10b981',
              color: '#10b981',
              borderRadius: '10px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: '700',
              animation: 'fadeIn 0.25s ease'
            }}
          >
            <CheckCircle2 size={15} />
            <span>Пакет модулей успешно обновлен и активен!</span>
          </div>
        )}
      </div>

      {/* Grid of 7 Commercial Modules */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '16px'
        }}
      >
        {PACKAGES.map((pkg) => {
          const isEnabled = enabledModules.includes(pkg.id);
          return (
            <div
              key={pkg.id}
              onClick={() => toggleModule(pkg.id)}
              style={{
                backgroundColor: isEnabled ? 'rgba(212, 175, 55, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                border: isEnabled ? '1.5px solid var(--accent-gold)' : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '18px',
                padding: '22px',
                cursor: pkg.required ? 'default' : 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: isEnabled ? '0 8px 24px rgba(212, 175, 55, 0.15)' : 'none',
                position: 'relative'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', gap: '8px' }}>
                  <div>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: isEnabled ? 'var(--accent-gold)' : 'var(--text-muted)',
                        backgroundColor: isEnabled ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        display: 'inline-block',
                        marginBottom: '6px'
                      }}
                    >
                      {pkg.badge}
                    </span>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: isEnabled ? '#fff' : 'var(--text-muted)', margin: 0 }}>
                      {pkg.name}
                    </h3>
                  </div>

                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: '800',
                      color: isEnabled ? 'var(--accent-gold)' : 'var(--text-muted)',
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      padding: '4px 8px',
                      borderRadius: '8px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {pkg.priceStr}
                  </span>
                </div>

                <p style={{ fontSize: '12px', color: isEnabled ? 'rgba(244, 244, 246, 0.85)' : 'var(--text-muted)', lineHeight: '1.55', margin: '0 0 16px 0' }}>
                  {pkg.desc}
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '14px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: isEnabled ? '#10b981' : '#64748b',
                      boxShadow: isEnabled ? '0 0 8px #10b981' : 'none'
                    }}
                  />
                  <span style={{ fontSize: '12px', fontWeight: '700', color: isEnabled ? '#10b981' : '#64748b' }}>
                    {isEnabled ? 'Подключен' : 'Отключен'}
                  </span>
                </div>

                {pkg.required ? (
                  <span style={{ fontSize: '11px', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Lock size={12} /> Базовый модуль
                  </span>
                ) : (
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                    {isEnabled ? 'Нажмите чтобы отключить' : 'Нажмите чтобы включить'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
};
