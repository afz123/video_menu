import React, { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GoldButton } from '../../components/ui/GoldButton';
import { menuService } from '../../services/menuService';
import { Check, ShieldCheck, Zap, Lock, Sparkles, CheckCircle2 } from 'lucide-react';

const PACKAGES = [
  {
    id: 'menu',
    name: '1. Core Digital Video Menu',
    price: 29,
    priceStr: '$29/мес',
    badge: 'Ядро системы',
    desc: 'Вертикальная видеолента Reels, ASMR-звук, постеры WebP, мультиязычность (RU/EN/TJ), стоп-лист в 1 клик.',
    required: true
  },
  {
    id: 'ordering',
    name: '2. Smart Ordering & Courses',
    price: 20,
    priceStr: '+$20/мес',
    badge: 'Заказы & Курсы',
    desc: 'Корзина гостя, выбор курсов подачи (Курс 1, 2, 3), модификаторы (прожарка, соусы), отправка чека в зал.'
  },
  {
    id: 'service_dispatch',
    name: '3. Staff Dispatcher & Telegram',
    price: 25,
    priceStr: '+$25/мес',
    badge: 'Сервис залов',
    desc: 'Вызов официанта, сомелье, кальянщика, управляющего, запрос счета (карта/наличные), Telegram-бот для смены.'
  },
  {
    id: 'guest_finance',
    name: '4. Split-Bill & Tips Fintech',
    price: 15,
    priceStr: '+$15/мес',
    badge: 'Fintech & Чаевые',
    desc: 'Калькулятор сплита счета на 1–6 персон, попозиционный расчет «Кто что ел + общий стол», чаевые официантам.'
  },
  {
    id: 'reservations',
    name: '5. Spatial Booking & 3D Floor Plan',
    price: 39,
    priceStr: '+$39/мес',
    badge: 'Бронирование & Залы',
    desc: 'Онлайн-бронь столов, фото-карта зала с этажами (1F, 2F), шахматка для хостес, Pacing кухни, защита от овербукинга.'
  },
  {
    id: 'kiosk',
    name: '6. Outdoor Smart Kiosk Mode',
    price: 49,
    priceStr: '+$49/мес',
    badge: 'Уличная витрина',
    desc: 'Уличный сенсорный экран, рекламный Attract-режим, сброс ПДн по таймеру 45с, QR-мост на телефон гостя.'
  },
  {
    id: 'kds',
    name: '7. Kitchen Display System (KDS)',
    price: 30,
    priceStr: '+$30/мес',
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

  const totalMonthly = PACKAGES.filter((p) => enabledModules.includes(p.id)).reduce((acc, p) => acc + p.price, 0);

  const handleSave = async () => {
    if (!restaurant?.slug) return;
    setIsSaving(true);
    try {
      await menuService.updateRestaurant(restaurant.slug, {
        enabled_modules: enabledModules
      });
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
              ${totalMonthly} <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-muted)' }}>/ месяц</span>
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
            Только базовое меню ($29)
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
