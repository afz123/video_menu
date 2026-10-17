import React, { useState } from 'react';
import { Bell, CreditCard, ShoppingBag, CheckCircle, X, ChevronRight } from 'lucide-react';
import { menuService } from '../../services/menuService';

export const SmartServiceBar = ({
  restaurantSlug,
  tableNumber,
  cartCount = 0,
  onOpenCart,
  onSetTableNumber
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('WAITER'); // 'WAITER' | 'BILL'
  const [table, setTable] = useState(tableNumber || '');
  const [billMethod, setBillMethod] = useState('card'); // 'card' | 'cash'
  const [guestNote, setGuestNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const handleOpenAction = (type) => {
    setModalType(type);
    setIsModalOpen(true);
  };

  const handleSendServiceRequest = async () => {
    if (!table.trim()) {
      alert('Пожалуйста, укажите номер стола');
      return;
    }

    setIsSubmitting(true);
    try {
      if (onSetTableNumber) onSetTableNumber(table.trim());

      let reqType = 'call_waiter';
      let comment = guestNote.trim() || 'Гость вызвал официанта к столу';

      if (modalType === 'BILL') {
        reqType = billMethod === 'card' ? 'request_bill_card' : 'request_bill_cash';
        comment = `Запрос счёта: оплата ${billMethod === 'card' ? 'банковской картой' : 'наличными'}. ${guestNote.trim()}`;
      }

      await menuService.createServiceRequest(restaurantSlug, {
        table_number: table.trim(),
        request_type: reqType,
        guest_comment: comment
      });

      setIsModalOpen(false);
      setToastMessage(
        modalType === 'WAITER'
          ? `🛎️ Официант вызван к столу №${table.trim()}!`
          : `💳 Счёт (${billMethod === 'card' ? 'карта' : 'наличные'}) запрошен для стола №${table.trim()}!`
      );
      setTimeout(() => setToastMessage(null), 4500);
      setGuestNote('');
    } catch (err) {
      alert('Ошибка отправки вызова: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 'calc(16px + env(safe-area-inset-top))',
            left: '16px',
            right: '16px',
            zIndex: 120,
            backgroundColor: 'rgba(18, 18, 24, 0.95)',
            border: '1px solid var(--accent-gold)',
            color: '#fff',
            borderRadius: '16px',
            padding: '12px 18px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px',
            fontWeight: '600',
            animation: 'fadeIn 0.3s ease'
          }}
        >
          <CheckCircle size={18} color="var(--accent-gold)" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Floating Service & Cart Bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 'calc(14px + env(safe-area-inset-bottom))',
          left: '14px',
          right: '14px',
          zIndex: 40,
          display: 'flex',
          gap: '8px',
          pointerEvents: 'auto'
        }}
      >
        {/* Call Waiter button */}
        <button
          onClick={() => handleOpenAction('WAITER')}
          style={{
            flex: cartCount > 0 ? '0 0 auto' : '1',
            backgroundColor: 'rgba(15, 15, 20, 0.85)',
            border: '1px solid rgba(212, 175, 55, 0.35)',
            borderRadius: '14px',
            padding: '10px 14px',
            color: '#fff',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)'
          }}
        >
          <Bell size={15} color="var(--accent-gold)" />
          <span>{cartCount > 0 ? 'Официант' : 'Позвать официанта'}</span>
        </button>

        {/* Request Bill button */}
        <button
          onClick={() => handleOpenAction('BILL')}
          style={{
            flex: cartCount > 0 ? '0 0 auto' : '1',
            backgroundColor: 'rgba(15, 15, 20, 0.85)',
            border: '1px solid rgba(212, 175, 55, 0.35)',
            borderRadius: '14px',
            padding: '10px 14px',
            color: '#fff',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)'
          }}
        >
          <CreditCard size={15} color="var(--accent-gold)" />
          <span>Счёт</span>
        </button>

        {/* Floating Cart Button (shows if items in cart) */}
        {cartCount > 0 && (
          <button
            onClick={onOpenCart}
            style={{
              flex: 1,
              background: 'var(--accent-gold-gradient)',
              border: 'none',
              borderRadius: '14px',
              padding: '10px 14px',
              color: '#09090b',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 8px 24px rgba(212, 175, 55, 0.4)'
            }}
          >
            <ShoppingBag size={16} strokeWidth={2.5} />
            <span>Заказ ({cartCount})</span>
          </button>
        )}
      </div>

      {/* Service Action Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 110,
            backgroundColor: 'rgba(0, 0, 0, 0.82)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center'
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '520px',
              backgroundColor: '#121217',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {modalType === 'WAITER' ? (
                  <Bell size={20} color="var(--accent-gold)" />
                ) : (
                  <CreditCard size={20} color="var(--accent-gold)" />
                )}
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', color: '#fff', margin: 0 }}>
                  {modalType === 'WAITER' ? 'Вызов официанта' : 'Запрос счёта'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
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

            {/* Table Number */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Номер вашего стола *
              </label>
              <input
                type="text"
                placeholder="Например: 12 или VIP-2"
                value={table}
                onChange={(e) => setTable(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(212, 175, 55, 0.3)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: '700',
                  outline: 'none'
                }}
              />
            </div>

            {/* If BILL, choose payment method */}
            {modalType === 'BILL' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Способ оплаты
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setBillMethod('card')}
                    style={{
                      padding: '12px',
                      borderRadius: '12px',
                      backgroundColor: billMethod === 'card' ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                      border: billMethod === 'card' ? '1px solid var(--accent-gold)' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: billMethod === 'card' ? 'var(--accent-gold)' : '#fff',
                      fontWeight: '600',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    💳 Банковская карта
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillMethod('cash')}
                    style={{
                      padding: '12px',
                      borderRadius: '12px',
                      backgroundColor: billMethod === 'cash' ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                      border: billMethod === 'cash' ? '1px solid var(--accent-gold)' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: billMethod === 'cash' ? 'var(--accent-gold)' : '#fff',
                      fontWeight: '600',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    💵 Наличные
                  </button>
                </div>
              </div>
            )}

            {/* Optional note */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Комментарий (опционально)
              </label>
              <input
                type="text"
                placeholder={modalType === 'WAITER' ? 'Принести бокалы / меню напитков...' : 'Нужен раздельный чек...'}
                value={guestNote}
                onChange={(e) => setGuestNote(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Submit button */}
            <button
              onClick={handleSendServiceRequest}
              disabled={isSubmitting}
              style={{
                width: '100%',
                background: 'var(--accent-gold-gradient)',
                border: 'none',
                borderRadius: '14px',
                padding: '14px',
                color: '#09090b',
                fontWeight: '700',
                fontSize: '15px',
                cursor: 'pointer',
                marginTop: '4px'
              }}
            >
              {isSubmitting ? 'Отправка...' : modalType === 'WAITER' ? 'Позвать официанта' : 'Запросить счёт'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
