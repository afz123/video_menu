import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { useLanguage } from '../../context/LanguageContext';
import { useUI } from '../../context/UIConfigContext';
import { useModules, MODULES } from '../../context/ModuleContext';
import { menuService } from '../../services/menuService';
import { X, Trash2, Plus, Minus, Send, CheckCircle2, QrCode, Sparkles, RefreshCw, Users, Heart } from 'lucide-react';
import { SmartBillSplitModal } from './SmartBillSplitModal';

const COURSES_OPTIONS = [
  { id: 'Курс 1 (Закуски)', label: '🥗 Курс 1' },
  { id: 'Курс 2 (Горячее)', label: '🥩 Курс 2' },
  { id: 'Курс 3 (Десерт)', label: '🍰 Курс 3' },
  { id: 'По готовности кухни', label: '⚡ По готовности' }
];

export const CartDrawer = ({
  cartItems = [],
  tableNumber = '',
  tableSignature = '',
  guestSessionId = '',
  restaurantSlug = '',
  currency = 'TJS',
  serviceChargePercent = 10,
  onClose,
  onUpdateQty,
  onUpdateItemCourse,
  onClearCart,
  onSetTableNumber
}) => {
  const { t } = useLanguage();
  const { hasModule } = useModules();
  const canFinance = hasModule(MODULES.GUEST_FINANCE);

  const ui = useUI();
  const cartUI = ui?.cart || {};
  const coursesEnabled = ui?.kitchen_pacing?.enable_courses_system !== false;
  const [table, setTable] = useState(tableNumber || '');
  const [isEditingTable, setIsEditingTable] = useState(false);
  const isTableFromQr = Boolean(table);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSentSuccess, setOrderSentSuccess] = useState(false);
  const [showWaiterScreen, setShowWaiterScreen] = useState(false);

  const [splitCount, setSplitCount] = useState(1);
  const [tipPercent, setTipPercent] = useState(10);
  const [isSmartSplitOpen, setIsSmartSplitOpen] = useState(false);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (tableNumber) {
      setTable(tableNumber);
    }
  }, [tableNumber]);

  const isRepeatOrder = typeof window !== 'undefined' && Boolean(sessionStorage.getItem('guest_ordered_' + (restaurantSlug || 'menu')));
  const activeCurrency = currency || cartItems[0]?.dish?.currency || 'TJS';

  const subtotal = cartItems.reduce((acc, item) => {
    return acc + (Number(item.totalPrice) || 0) * (item.quantity || 1);
  }, 0);

  const serviceCharge = (canFinance && cartUI.show_service_charge !== false) ? subtotal * (Number(serviceChargePercent) / 100) : 0;
  const tipAmount = (canFinance && cartUI.show_tip_tiers !== false && tipPercent > 0) ? (subtotal * tipPercent / 100) : 0;
  const grandTotal = subtotal + serviceCharge + tipAmount;
  const splitAmount = grandTotal / Math.max(1, splitCount);

  const handleCycleCourse = (idx) => {
    const current = cartItems[idx]?.course || 'По готовности кухни';
    const currentIdx = COURSES_OPTIONS.findIndex((c) => c.id === current);
    const nextIdx = (currentIdx + 1) % COURSES_OPTIONS.length;
    if (onUpdateItemCourse) {
      onUpdateItemCourse(idx, COURSES_OPTIONS[nextIdx].id);
    } else {
      cartItems[idx].course = COURSES_OPTIONS[nextIdx].id;
      forceUpdate((n) => n + 1);
    }
  };

  const handleSendOrder = async () => {
    if (!table.trim()) {
      alert('Пожалуйста, укажите номер вашего стола (например: 12)');
      return;
    }

    setIsSubmitting(true);
    try {
      if (onSetTableNumber) onSetTableNumber(table.trim());

      const orderComment = isRepeatOrder
        ? `🔁 ДОЗАКАЗ блюд к столу №${table.trim()}`
        : 'Заказ блюд через интерактивное мобильное меню';

      await menuService.createServiceRequest(restaurantSlug, {
        table_number: table.trim(),
        table_token: tableSignature || undefined,
        guest_session_id: guestSessionId || undefined,
        request_type: isRepeatOrder ? 'repeat_order' : 'order',
        guest_comment: orderComment,
        tip_percent: (canFinance && cartUI.show_tip_tiers !== false) ? tipPercent : undefined,
        tip_amount: (canFinance && cartUI.show_tip_tiers !== false) ? tipAmount : undefined,
        cart_items: cartItems.map((item) => ({
          dish_id: item.dish.id,
          id: item.dish.id,
          name: t(item.dish.name),
          quantity: item.quantity || 1,
          price: item.totalPrice,
          currency: item.dish.currency,
          course: item.course || 'По готовности кухни',
          chosen_options: item.chosenOptions || [],
          comment: item.comment || ''
        }))
      });

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('guest_ordered_' + (restaurantSlug || 'menu'), 'true');
      }

      setOrderSentSuccess(true);
      onClearCart();
    } catch (err) {
      alert('Не удалось отправить заказ: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showWaiterScreen && cartUI.show_waiter_screen_btn !== false) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 110,
          backgroundColor: '#09090b',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          color: '#fff'
        }}
      >
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '700' }}>
              Экран для официанта • Стол №{table || '—'}
            </span>
            <button
              onClick={() => setShowWaiterScreen(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>
          </div>

          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', color: '#fff', marginBottom: '20px' }}>
            Выбранные позиции
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '55vh', overflowY: 'auto' }}>
            {cartItems.map((item, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '14px',
                  padding: '14px 16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: '700' }}>
                  <span>{item.quantity}x {t(item.dish.name)}</span>
                  <span style={{ color: 'var(--accent-gold)' }}>{(item.totalPrice * item.quantity).toFixed(0)} {activeCurrency}</span>
                </div>
                {coursesEnabled && item.course && (
                  <div style={{ display: 'inline-block', marginTop: '6px', backgroundColor: 'rgba(212, 175, 55, 0.15)', border: '1px solid var(--accent-gold)', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', color: 'var(--accent-gold)', fontWeight: '600' }}>
                    ⏱️ {item.course}
                  </div>
                )}
                {item.chosenOptions?.length > 0 && (
                  <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.75)', marginTop: '4px' }}>
                    {item.chosenOptions.map((o) => o.name).join(' • ')}
                  </div>
                )}
                {item.comment && (
                  <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', marginTop: '4px' }}>
                    «{item.comment}»
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.15)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', color: 'var(--text-muted)' }}>
            <span>Стоимость блюд:</span>
            <span>{subtotal.toFixed(0)} {activeCurrency}</span>
          </div>
          {cartUI.show_service_charge !== false && serviceCharge > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: 'rgba(212, 175, 55, 0.9)' }}>
              <span>Обслуживание ({serviceChargePercent}%):</span>
              <span>+{serviceCharge.toFixed(1)} {activeCurrency}</span>
            </div>
          )}
          {cartUI.show_tip_tiers !== false && tipAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#4ade80' }}>
              <span>Чаевые ({tipPercent}%):</span>
              <span>+{tipAmount.toFixed(1)} {activeCurrency}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 12px', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '8px' }}>
            <span style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>Итого к оплате:</span>
            <span style={{ fontSize: '28px', fontWeight: '800', color: 'var(--accent-gold)' }}>
              {grandTotal.toFixed(1)} {activeCurrency}
            </span>
          </div>
          <button
            onClick={() => setShowWaiterScreen(false)}
            style={{
              width: '100%',
              backgroundColor: 'var(--accent-gold)',
              border: 'none',
              borderRadius: '14px',
              padding: '16px',
              color: '#09090b',
              fontWeight: '700',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            Закрыть экран
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: '#0c0c10',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          borderTop: '1px solid var(--glass-border)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '20px 20px calc(24px + env(safe-area-inset-bottom))',
          boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.9)',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', color: '#fff', margin: 0 }}>
              {isRepeatOrder ? 'Дозаказ к столу' : 'Ваш заказ'}
            </h2>
            {isRepeatOrder && (
              <span
                style={{
                  background: 'rgba(212, 175, 55, 0.2)',
                  color: 'var(--accent-gold)',
                  border: '1px solid var(--accent-gold)',
                  borderRadius: '6px',
                  padding: '2px 6px',
                  fontSize: '10px',
                  fontWeight: '700',
                  letterSpacing: '0.04em'
                }}
              >
                ДОЗАКАЗ
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {orderSentSuccess ? (
          <div style={{ textAlign: 'center', padding: '36px 16px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(212, 175, 55, 0.15)',
                border: '1px solid var(--accent-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                color: 'var(--accent-gold)'
              }}
            >
              <CheckCircle2 size={36} />
            </div>
            <h3 style={{ fontSize: '20px', color: '#fff', marginBottom: '8px' }}>
              {isRepeatOrder ? 'Дозаказ отправлен на кухню!' : 'Заказ отправлен!'}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '20px' }}>
              Официант уже спешит к столу <strong style={{ color: 'var(--accent-gold)' }}>№{table}</strong> для подтверждения и передачи в цех.
            </p>

            {cartUI.show_live_status_tracker !== false && (
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(212, 175, 55, 0.25)', borderRadius: '16px', padding: '16px 14px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '14px', left: '24px', right: '24px', height: '2px', background: 'rgba(255,255,255,0.1)', zIndex: 1 }}>
                    <div style={{ width: '50%', height: '100%', background: 'var(--accent-gold)' }} />
                  </div>
                  <div style={{ zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-gold)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800' }}>✓</div>
                    <span style={{ fontSize: '11px', color: '#fff', fontWeight: '600' }}>Принят</span>
                  </div>
                  <div style={{ zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(212, 175, 55, 0.25)', border: '2px solid var(--accent-gold)', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}>👨🍳</div>
                    <span style={{ fontSize: '11px', color: 'var(--accent-gold)', fontWeight: '700' }}>Готовится</span>
                  </div>
                  <div style={{ zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.08)', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>🍽️</div>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Подача</span>
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'var(--accent-gold-gradient)',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 28px',
                color: '#000',
                fontWeight: '700',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Вернуться в меню
            </button>
          </div>
        ) : cartItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '16px', color: '#fff', marginBottom: '6px' }}>В заказе пока пусто</p>
            <p style={{ fontSize: '13px' }}>Листайте меню и нажимайте кнопку «В заказ» под понравившимися блюдами</p>
          </div>
        ) : (
          <>
            {isTableFromQr && !isEditingTable ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'rgba(212, 175, 55, 0.08)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  marginBottom: '14px',
                  border: '1px solid rgba(212, 175, 55, 0.25)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <QrCode size={16} color="var(--accent-gold)" />
                  <span style={{ fontSize: '13px', color: '#fff' }}>
                    Стол: <strong style={{ color: 'var(--accent-gold)', fontSize: '15px' }}>№{table}</strong>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginLeft: '6px' }}>
                      (зафиксирован по QR)
                    </span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Вы действительно пересели за другой стол? Пожалуйста, меняйте номер только если сменили место.')) {
                      setIsEditingTable(true);
                    }
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    color: 'var(--text-muted)',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  Изменить
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  marginBottom: '14px',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
              >
                <span style={{ fontSize: '13px', color: 'var(--accent-gold)', fontWeight: '600', whiteSpace: 'nowrap' }}>
                  Номер стола:
                </span>
                <input
                  type="text"
                  placeholder="напр. 12 или VIP-1"
                  value={table}
                  onChange={(e) => setTable(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: '700',
                    outline: 'none'
                  }}
                />
                {isEditingTable && (
                  <button
                    type="button"
                    onClick={() => setIsEditingTable(false)}
                    style={{
                      background: 'rgba(212, 175, 55, 0.15)',
                      border: '1px solid var(--accent-gold)',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      color: 'var(--accent-gold)',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Готово
                  </button>
                )}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '36vh', overflowY: 'auto', marginBottom: '14px' }}>
              {cartItems.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>
                      {t(item.dish.name)}
                    </div>
                    {coursesEnabled && !cartUI.wishlist_only_mode && (
                      <button
                        type="button"
                        onClick={() => handleCycleCourse(idx)}
                        title="Нажмите, чтобы переключить курс подачи"
                        style={{
                          marginTop: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: 'rgba(212, 175, 55, 0.12)',
                          border: '1px solid rgba(212, 175, 55, 0.3)',
                          borderRadius: '6px',
                          padding: '2px 8px',
                          color: 'var(--accent-gold)',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        <span>⏱️ {item.course || 'По готовности'}</span>
                        <span style={{ fontSize: '9px', opacity: 0.7 }}>⇄</span>
                      </button>
                    )}
                    {item.chosenOptions?.length > 0 && (
                      <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '3px' }}>
                        {item.chosenOptions.map((o) => o.name).join(' • ')}
                      </div>
                    )}
                    <div style={{ fontSize: '13px', color: 'var(--accent-gold)', marginTop: '4px', fontWeight: '700' }}>
                      {item.totalPrice} {item.dish.currency}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => onUpdateQty(idx, -1)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.08)',
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Minus size={14} />
                    </button>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#fff', minWidth: '16px', textAlign: 'center' }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQty(idx, 1)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.08)',
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {canFinance && !cartUI.wishlist_only_mode && ((cartUI.show_split_bill !== false) || (cartUI.show_tip_tiers !== false)) && (
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', padding: '10px 12px', marginBottom: '12px', border: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {cartUI.show_split_bill !== false && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#fff' }}>
                        <Users size={14} color="var(--accent-gold)" />
                        <span>Разделить чек:</span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {[1, 2, 3, 4, 5, 6].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setSplitCount(num)}
                            style={{
                              background: splitCount === num ? 'var(--accent-gold-gradient)' : 'rgba(255, 255, 255, 0.06)',
                              color: splitCount === num ? '#09090b' : 'rgba(255, 255, 255, 0.8)',
                              border: 'none',
                              borderRadius: '6px',
                              width: '26px',
                              height: '26px',
                              fontSize: '11px',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>

                    {splitCount > 1 && (
                      <div style={{ fontSize: '11px', color: 'var(--accent-gold)', textAlign: 'right' }}>
                        По {splitAmount.toFixed(0)} {activeCurrency} на каждого гостя (из {splitCount})
                      </div>
                    )}

                    {cartUI.show_smart_item_split !== false && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
                        <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)' }}>Позиционный расчет:</span>
                        <button
                          type="button"
                          onClick={() => setIsSmartSplitOpen(true)}
                          style={{
                            background: 'rgba(212, 175, 55, 0.15)',
                            border: '1px solid var(--accent-gold)',
                            color: 'var(--accent-gold)',
                            borderRadius: '8px',
                            padding: '4px 10px',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          <Sparkles size={12} />
                          <span>✨ По блюдам + Общий стол</span>
                        </button>
                      </div>
                    )}
                  </>
                )}

                {cartUI.show_tip_tiers !== false && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: cartUI.show_split_bill !== false ? '4px' : '0', borderTop: cartUI.show_split_bill !== false ? '1px solid rgba(255, 255, 255, 0.05)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#fff' }}>
                      <Heart size={14} color="#f43f5e" />
                      <span>Чаевые:</span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[
                        { pct: 0, label: '0%' },
                        { pct: 10, label: '10%' },
                        { pct: 15, label: '15%' },
                        { pct: 20, label: '20%' }
                      ].map((tTier) => (
                        <button
                          key={tTier.pct}
                          type="button"
                          onClick={() => setTipPercent(tTier.pct)}
                          style={{
                            background: tipPercent === tTier.pct ? 'rgba(244, 63, 94, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                            color: tipPercent === tTier.pct ? '#fda4af' : 'rgba(255, 255, 255, 0.8)',
                            border: tipPercent === tTier.pct ? '1px solid #f43f5e' : '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '6px',
                            padding: '3px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          {tTier.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                <span>{cartUI.wishlist_only_mode ? 'Выбранные блюда:' : 'Блюда:'}</span>
                <span>{subtotal.toFixed(0)} {activeCurrency}</span>
              </div>
              {!cartUI.wishlist_only_mode && cartUI.show_service_charge !== false && serviceCharge > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'rgba(212, 175, 55, 0.9)' }}>
                  <span>Обслуживание ({serviceChargePercent}%):</span>
                  <span>+{serviceCharge.toFixed(1)} {activeCurrency}</span>
                </div>
              )}
              {!cartUI.wishlist_only_mode && cartUI.show_tip_tiers !== false && tipAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#4ade80' }}>
                  <span>Чаевые ({tipPercent}%):</span>
                  <span>+{tipAmount.toFixed(1)} {activeCurrency}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '2px 0 6px' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>
                  {cartUI.wishlist_only_mode ? 'Предварительная сумма:' : 'Итого к оплате:'}
                </span>
                <span style={{ fontSize: '24px', fontWeight: '800', color: 'var(--accent-gold)' }}>
                  {(cartUI.wishlist_only_mode ? subtotal : grandTotal).toFixed(1)} {activeCurrency}
                </span>
              </div>

              {/* Режим витрины / черновика: если включен wishlist_only_mode, скрываем отправку и финансовые обязательства */}
              {!cartUI.wishlist_only_mode && (cartUI.show_waiter_screen_btn !== false || cartUI.allow_self_ordering !== false) && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: (cartUI.show_waiter_screen_btn !== false && cartUI.allow_self_ordering !== false) ? '1fr 1fr' : '1fr',
                    gap: '10px',
                    marginTop: '8px'
                  }}
                >
                  {cartUI.show_waiter_screen_btn !== false && (
                    <button
                      type="button"
                      onClick={() => setShowWaiterScreen(true)}
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '12px',
                        padding: '12px',
                        color: '#fff',
                        fontWeight: '600',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      Показать официанту
                    </button>
                  )}

                  {cartUI.allow_self_ordering !== false && (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleSendOrder}
                      style={{
                        background: 'var(--accent-gold-gradient)',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '12px',
                        color: '#09090b',
                        fontWeight: '700',
                        fontSize: '13px',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Send size={15} />
                      <span>{isSubmitting ? 'Отправка...' : 'Отправить заказ'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {canFinance && isSmartSplitOpen && cartUI.show_smart_item_split !== false && (
        <SmartBillSplitModal
          cartItems={cartItems}
          currency={activeCurrency}
          serviceChargePercent={cartUI.show_service_charge !== false ? serviceChargePercent : 0}
          tipPercent={cartUI.show_tip_tiers !== false ? tipPercent : 0}
          onClose={() => setIsSmartSplitOpen(false)}
        />
      )}
    </div>
  );
};
