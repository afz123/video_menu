import React, { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GoldButton } from '../../components/ui/GoldButton';
import { menuService } from '../../services/menuService';
import { X, Calendar, User, Phone, Users, Clock, CheckCircle } from 'lucide-react';

export const BookingModal = ({ restaurantSlug, restaurantName, onClose }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+992 ');
  const [guestsCount, setGuestsCount] = useState('2');
  const [time, setTime] = useState('19:30');
  const [date, setDate] = useState('Сегодня');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || phone.trim().length < 8) {
      alert('Пожалуйста, укажите имя и контактный номер телефона');
      return;
    }

    setIsSubmitting(true);
    try {
      await menuService.createServiceRequest(restaurantSlug, {
        table_number: 'КИОСК-УЛИЦА',
        request_type: 'call_waiter',
        guest_comment: `📅 БРОНЬ СТОЛА С УЛИЧНОГО КИОСКА:\nГость: ${name.trim()}\nТелефон: ${phone.trim()}\nДата/Время: ${date} в ${time}\nПерсон: ${guestsCount}`
      });
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
      }, 3500);
    } catch (err) {
      alert('Ошибка при отправке заявки: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        backgroundColor: 'rgba(9, 9, 11, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '30px',
        animation: 'fadeIn 0.25s ease'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: '#121217',
          border: '2px solid var(--accent-gold)',
          borderRadius: '28px',
          padding: '36px 32px',
          color: '#fff',
          boxShadow: '0 24px 70px rgba(0, 0, 0, 0.9), 0 0 40px rgba(212, 175, 55, 0.25)',
          position: 'relative'
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X size={20} />
        </button>

        {isSuccess ? (
          <div style={{ textAlign: 'center', padding: '30px 10px' }}>
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                backgroundColor: 'rgba(212, 175, 55, 0.15)',
                color: 'var(--accent-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px'
              }}
            >
              <CheckCircle size={44} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', color: '#fff', margin: '0 0 12px' }}>
              Стол предварительно забронирован!
            </h3>
            <p style={{ fontSize: '16px', color: 'var(--text-muted)', lineHeight: '1.5', maxWidth: '420px', margin: '0 auto' }}>
              Хостес заведения <b>{restaurantName}</b> уже получила вашу заявку и свяжется с вами по номеру <b>{phone}</b> для подтверждения.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--accent-gold)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                Предварительное бронирование
              </span>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', color: '#fff', margin: '4px 0 6px' }}>
                Забронировать стол
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
                Оставьте заявку уличного киоска — менеджер забронирует лучший столик
              </p>
            </div>

            {/* Name */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>
                <User size={15} color="var(--accent-gold)" />
                <span>Ваше имя:</span>
              </label>
              <input
                type="text"
                required
                placeholder="Имя Фамилия"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '14px',
                  padding: '14px 16px',
                  color: '#fff',
                  fontSize: '16px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Phone */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>
                <Phone size={15} color="var(--accent-gold)" />
                <span>Номер телефона для связи:</span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '14px',
                  padding: '14px 16px',
                  color: 'var(--accent-gold)',
                  fontSize: '18px',
                  fontWeight: '700',
                  outline: 'none'
                }}
              />
            </div>

            {/* Date, Time & Guests Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Дата:
                </label>
                <select
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    padding: '12px',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                >
                  <option value="Сегодня" style={{ background: '#121217' }}>Сегодня</option>
                  <option value="Завтра" style={{ background: '#121217' }}>Завтра</option>
                  <option value="Пятница" style={{ background: '#121217' }}>Пятница</option>
                  <option value="Суббота" style={{ background: '#121217' }}>Суббота</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Время:
                </label>
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    padding: '12px',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                >
                  <option value="18:00" style={{ background: '#121217' }}>18:00</option>
                  <option value="19:00" style={{ background: '#121217' }}>19:00</option>
                  <option value="19:30" style={{ background: '#121217' }}>19:30</option>
                  <option value="20:00" style={{ background: '#121217' }}>20:00</option>
                  <option value="21:00" style={{ background: '#121217' }}>21:00</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Гостей:
                </label>
                <select
                  value={guestsCount}
                  onChange={(e) => setGuestsCount(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    padding: '12px',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                >
                  <option value="1-2 персоны" style={{ background: '#121217' }}>1-2 персоны</option>
                  <option value="3-4 персоны" style={{ background: '#121217' }}>3-4 персоны</option>
                  <option value="5-8 персон" style={{ background: '#121217' }}>5-8 персон</option>
                  <option value="VIP-зал (банкет)" style={{ background: '#121217' }}>VIP-зал</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                marginTop: '10px',
                background: 'var(--accent-gold-gradient)',
                border: 'none',
                borderRadius: '16px',
                padding: '16px',
                color: '#09090b',
                fontWeight: '700',
                fontSize: '16px',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(212, 175, 55, 0.4)'
              }}
            >
              {isSubmitting ? 'Отправка заявки...' : 'Забронировать стол'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
