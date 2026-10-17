import React, { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { useLanguage } from '../../context/LanguageContext';
import { menuService } from '../../services/menuService';
import { X, Trash2, Plus, Minus, Send, CheckCircle2, QrCode, Sparkles } from 'lucide-react';

export const CartDrawer = ({
  cartItems = [],
  tableNumber = '',
  restaurantSlug = '',
  serviceChargePercent = 10,
  onClose,
  onUpdateQty,
  onClearCart,
  onSetTableNumber
}) => {
  const { t } = useLanguage();
  const [table, setTable] = useState(tableNumber || '');
  const [isEditingTable, setIsEditingTable] = useState(false);
  const isTableFromQr = Boolean(tableNumber);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSentSuccess, setOrderSentSuccess] = useState(false);
  const [showWaiterScreen, setShowWaiterScreen] = useState(false);

  const subtotal = cartItems.reduce((acc, item) => {
    return acc + (Number(item.totalPrice) || 0) * (item.quantity || 1);
  }, 0);
  const serviceCharge = subtotal * (Number(serviceChargePercent) / 100);
  const grandTotal = subtotal + serviceCharge;

  const handleSendOrder = async () => {
    if (!table.trim()) {
      alert('Пожалуйста, укажите номер вашего стола (например: 12)');
      return;
    }

    setIsSubmitting(true);
    try {
      if (onSetTableNumber) onSetTableNumber(table.trim());

      await menuService.createServiceRequest(restaurantSlug, {
        table_number: table.trim(),
        request_type: 'order',
        guest_comment: 'Заказ блюд через интерактивное мобильное меню',
        cart_items: cartItems.map((item) => ({
          dish_id: item.dish.id,
          id: item.dish.id,
          name: t(item.dish.name),
          quantity: item.quantity || 1,
          price: item.totalPrice,
          currency: item.dish.currency,
          chosen_options: item.chosenOptions || [],
          comment: item.comment || ''
        }))
      });

      setOrderSentSuccess(true);
      onClearCart();
    } catch (err) {
      alert('Не удалось отправить заказ: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Full-Screen Waiter Presentation Screen
  if (showWaiterScreen) {
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '60vh', overflowY: 'auto' }}>
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
                  <span style={{ color: 'var(--accent-gold)' }}>{(item.totalPrice * item.quantity).toFixed(0)} TJS</span>
                </div>
                {item.chosenOptions?.length > 0 && (
                  <div style={{ fontSize: '13px', color: 'var(--accent-gold)', marginTop: '4px' }}>
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
            <span>{subtotal.toFixed(0)} TJS</span>
          </div>
          {serviceCharge > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: 'rgba(212, 175, 55, 0.9)' }}>
              <span>Обслуживание ({serviceChargePercent}%):</span>
              <span>+{serviceCharge.toFixed(1)} TJS</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 12px', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '8px' }}>
            <span style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>Итого к оплате:</span>
            <span style={{ fontSize: '28px', fontWeight: '800', color: 'var(--accent-gold)' }}>
              {grandTotal.toFixed(1)} TJS
            </span>
          </div>
          <button
            onClick={() => setShowWaiterScreen(false)}
            style={{
              width: '100%',
              backgroundColor: 'var(--accent-gold)',
              border: 'none',
              borderRadius: '14px',
              padding: '14px',
              color: '#000',
              fontWeight: '700',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            Вернуться в меню
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
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center'
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: '88vh',
          backgroundColor: '#121217',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          border: '1px solid rgba(212, 175, 55, 0.3)',
          borderBottom: 'none',
          padding: '22px 20px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.85)',
          overflowY: 'auto'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🛒</span>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', color: '#fff', margin: 0 }}>
              Мой заказ
            </h3>
            {cartItems.length > 0 && (
              <span style={{ background: 'rgba(212, 175, 55, 0.2)', color: 'var(--accent-gold)', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px' }}>
                {cartItems.length} поз.
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: '#fff',
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
          <div style={{ textAlign: 'center', padding: '28px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <CheckCircle2 size={32} />
            </div>
            <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', color: '#fff', margin: 0 }}>
              Заказ отправлен!
            </h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '320px', lineHeight: '1.4', margin: 0 }}>
              Официант уже спешит к столу <strong style={{ color: 'var(--accent-gold)' }}>№{table}</strong> для подтверждения и передачи на кухню.
            </p>

            {/* Live Status Tracker for Guest Peace of Mind */}
            <div style={{
              width: '100%',
              maxWidth: '340px',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(212, 175, 55, 0.2)',
              borderRadius: '14px',
              padding: '14px 16px',
              textAlign: 'left',
              marginTop: '4px'
            }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-gold)', fontWeight: '700', marginBottom: '10px' }}>
                Статус обслуживания
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#fff' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                  <span>Заказ принят системой</span>
                  <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#10b981', fontWeight: '700' }}>✓</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--accent-gold)' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-gold)', animation: 'pulseGlow 1.5s infinite' }} />
                  <span>Уведомление в Telegram смене</span>
                  <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--accent-gold)' }}>Сейчас</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'rgba(255, 255, 255, 0.4)' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.2)' }} />
                  <span>Приготовление блюд</span>
                  <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>Ожидает</span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                marginTop: '10px',
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
            {/* Table Number Bar with QR Lock Protection */}
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

            {/* Cart Items List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '45vh', overflowY: 'auto', marginBottom: '16px' }}>
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
                    {item.chosenOptions?.length > 0 && (
                      <div style={{ fontSize: '12px', color: 'var(--accent-gold)', marginTop: '2px' }}>
                        {item.chosenOptions.map((o) => o.name).join(' • ')}
                      </div>
                    )}
                    <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '4px', fontWeight: '700' }}>
                      {item.totalPrice} {item.dish.currency}
                    </div>
                  </div>

                  {/* Quantity controls */}
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

            {/* Footer Summary & Dual Actions */}
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
                <span>Блюда:</span>
                <span>{subtotal.toFixed(0)} TJS</span>
              </div>
              {serviceCharge > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'rgba(212, 175, 55, 0.9)' }}>
                  <span>Обслуживание ({serviceChargePercent}%):</span>
                  <span>+{serviceCharge.toFixed(1)} TJS</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '2px 0 6px' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>Итого к оплате:</span>
                <span style={{ fontSize: '24px', fontWeight: '800', color: 'var(--accent-gold)' }}>
                  {grandTotal.toFixed(1)} TJS
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
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
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Send size={15} />
                  <span>{isSubmitting ? 'Отправка...' : 'Отправить заказ'}</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
