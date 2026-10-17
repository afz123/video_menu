import React, { useState } from 'react';
import { Bell, CreditCard, ShoppingBag, CheckCircle, X, ChevronRight } from 'lucide-react';
import { menuService } from '../../services/menuService';

export const SmartServiceBar = ({
  restaurantSlug,
  tableNumber,
  cartCount = 0,
  hidden = false,
  callTypesEnabled = ['waiter', 'bill', 'sommelier', 'hookah', 'admin'],
  onOpenCart,
  onSetTableNumber
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('WAITER'); // 'WAITER' | 'BILL'
  const [specialistType, setSpecialistType] = useState('waiter'); // 'waiter' | 'sommelier' | 'hookah' | 'admin'
  const [table, setTable] = useState(tableNumber || '');
  const [isEditingTable, setIsEditingTable] = useState(false);
  const isTableFromQr = Boolean(tableNumber);
  const [billMethod, setBillMethod] = useState('card'); // 'card' | 'cash'
  const [npsRating, setNpsRating] = useState(5);
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
      let comment = guestNote.trim() || 'Гость вызвал персонал к столу';

      if (modalType === 'BILL') {
        reqType = billMethod === 'card' ? 'request_bill_card' : 'request_bill_cash';
        const npsText = `Оценка визита: ${npsRating}/5 ⭐.`;
        comment = `Запрос счёта: оплата ${billMethod === 'card' ? 'банковской картой' : 'наличными'}. ${npsText} ${guestNote.trim()}`;
        
        // If guest gave low score (1-3), also add manager alert in comment
        if (npsRating <= 3) {
          comment = `⚠️ ВНИМАНИЕ: Гость оценил визит на ${npsRating}/5 звёзд! Требуется внимание управляющего.\n` + comment;
        }
      } else {
        if (specialistType === 'sommelier') {
          reqType = 'call_sommelier';
          comment = `🍷 Вызов сомелье для винной консультации. ${guestNote.trim()}`;
        } else if (specialistType === 'hookah') {
          reqType = 'call_hookah';
          comment = `💨 Вызов кальянного мастера. ${guestNote.trim()}`;
        } else if (specialistType === 'admin') {
          reqType = 'call_admin';
          comment = `👔 Вызов администратора / управляющего залом. ${guestNote.trim()}`;
        } else {
          reqType = 'call_waiter';
          comment = guestNote.trim() || 'Гость вызвал официанта к столу';
        }
      }

      await menuService.createServiceRequest(restaurantSlug, {
        table_number: table.trim(),
        request_type: reqType,
        guest_comment: comment
      });

      setIsModalOpen(false);
      let toast = `🛎️ Официант вызван к столу №${table.trim()}!`;
      if (modalType === 'BILL') {
        toast = `💳 Счёт (${billMethod === 'card' ? 'карта' : 'наличные'}) запрошен для стола №${table.trim()}!`;
      } else if (specialistType === 'sommelier') {
        toast = `🍷 Сомелье приглашён к столу №${table.trim()}!`;
      } else if (specialistType === 'hookah') {
        toast = `💨 Кальянный мастер приглашён к столу №${table.trim()}!`;
      } else if (specialistType === 'admin') {
        toast = `👔 Администратор приглашён к столу №${table.trim()}!`;
      }

      setToastMessage(toast);
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
          pointerEvents: hidden ? 'none' : 'auto',
          transform: hidden ? 'translateY(160%)' : 'translateY(0)',
          opacity: hidden ? 0 : 1,
          transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
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
              gap: '16px',
              pointerEvents: isSubmitting ? 'none' : 'auto',
              opacity: isSubmitting ? 0.6 : 1,
              transition: 'opacity 0.2s ease'
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

            {/* Table Number with QR Lock */}
            {isTableFromQr && !isEditingTable ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'rgba(212, 175, 55, 0.08)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  border: '1px solid rgba(212, 175, 55, 0.25)'
                }}
              >
                <span style={{ fontSize: '13px', color: '#fff' }}>
                  Стол: <strong style={{ color: 'var(--accent-gold)', fontSize: '15px' }}>№{table}</strong>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginLeft: '6px' }}>(по QR-коду)</span>
                </span>
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
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Номер вашего стола *
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Например: 12 или VIP-2"
                    value={table}
                    onChange={(e) => setTable(e.target.value)}
                    style={{
                      flex: 1,
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
                  {isEditingTable && (
                    <button
                      type="button"
                      onClick={() => setIsEditingTable(false)}
                      style={{
                        background: 'rgba(212, 175, 55, 0.15)',
                        border: '1px solid var(--accent-gold)',
                        borderRadius: '10px',
                        padding: '0 12px',
                        color: 'var(--accent-gold)',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Готово
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* If WAITER, choose specialist: Waiter, Sommelier, Hookah Master, Admin */}
            {modalType === 'WAITER' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Кого пригласить к столу?
                </label>
                {(() => {
                  const ALL_SPECIALISTS = [
                    { id: 'waiter', label: 'Официант', icon: '🛎️' },
                    { id: 'sommelier', label: 'Сомелье', icon: '🍷' },
                    { id: 'hookah', label: 'Кальянщик', icon: '💨' },
                    { id: 'admin', label: 'Управляющий', icon: '👔' }
                  ];
                  const specialists = ALL_SPECIALISTS.filter((s) => callTypesEnabled.includes(s.id));
                  const displaySpecialists = specialists.length > 0 ? specialists : [ALL_SPECIALISTS[0]];
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(displaySpecialists.length, 4)}, 1fr)`, gap: '8px' }}>
                      {displaySpecialists.map((s) => {
                        const isSelected = specialistType === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setSpecialistType(s.id)}
                            style={{
                              padding: '10px 6px',
                              borderRadius: '12px',
                              backgroundColor: isSelected ? 'rgba(212, 175, 55, 0.16)' : 'rgba(255, 255, 255, 0.04)',
                              border: isSelected ? '1px solid var(--accent-gold)' : '1px solid rgba(255, 255, 255, 0.1)',
                              color: isSelected ? 'var(--accent-gold)' : '#fff',
                              fontWeight: '600',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <span style={{ fontSize: '20px' }}>{s.icon}</span>
                            <span>{s.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* If BILL, choose payment method & NPS Feedback */}
            {modalType === 'BILL' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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

                {/* 1-Tap NPS Rating */}
                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '14px', padding: '12px 14px', border: '1px solid rgba(212, 175, 55, 0.15)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
                      Оцените ваш визит сегодня:
                    </span>
                    <span style={{ fontSize: '11px', color: npsRating >= 4 ? 'var(--accent-gold)' : '#f87171', fontWeight: '700' }}>
                      {npsRating === 5 ? 'Превосходно! ✨' : npsRating === 4 ? 'Хорошо 👍' : 'Есть замечания ⚠️'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNpsRating(star)}
                        style={{
                          flex: 1,
                          padding: '8px 0',
                          borderRadius: '10px',
                          border: star <= npsRating ? '1px solid var(--accent-gold)' : '1px solid rgba(255,255,255,0.08)',
                          backgroundColor: star <= npsRating ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255,255,255,0.02)',
                          color: star <= npsRating ? 'var(--accent-gold)' : 'rgba(255,255,255,0.3)',
                          fontSize: '18px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        ★
                      </button>
                    ))}
                  </div>
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
              {isSubmitting
                ? 'Отправка...'
                : modalType === 'BILL'
                ? 'Запросить счёт'
                : specialistType === 'sommelier'
                ? '🍷 Пригласить сомелье'
                : specialistType === 'hookah'
                ? '💨 Пригласить кальянщика'
                : specialistType === 'admin'
                ? '👔 Пригласить управляющего'
                : '🛎️ Позвать официанта'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
