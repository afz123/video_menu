import React, { useState, useEffect } from 'react';
import { menuService } from '../../services/menuService';
import { useUI } from '../../context/UIConfigContext';
import { 
  X, CheckCircle, ChevronRight, AlertCircle, RefreshCw
} from 'lucide-react';
import { InteractiveFloorPlan } from './InteractiveFloorPlan';
import { LuxuryDatePicker } from '../../components/ui/LuxuryDatePicker';

export const BookingModal = ({ restaurantSlug, restaurantName, currency = 'TJS', onClose }) => {
  const ui = useUI();
  const kioskUI = ui?.kiosk || {};
  const [step, setStep] = useState(1); // 1: Параметры и слоты, 2: Контакты, 3: Успех
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [guestsCount, setGuestsCount] = useState(2);
  const [zones, setZones] = useState([]);
  const [fullZones, setFullZones] = useState([]);
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedSlotEnd, setSelectedSlotEnd] = useState('');
  const [suggestedTableId, setSuggestedTableId] = useState(null);

  const defaultDialCode = {
    RUB: '+7 ', KZT: '+7 ', UZS: '+998 ', AED: '+971 ', USD: '+1 ', EUR: '+49 ', TJS: '+992 '
  }[currency] || '+992 ';
  
  // Контакты с динамическим кодом страны
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(defaultDialCode);
  const [wishes, setWishes] = useState('');
  const [bookingResult, setBookingResult] = useState(null);

  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Zero-trace очистка ПДн при закрытии / размонтировании модального окна на сенсорном киоске
  useEffect(() => {
    return () => {
      setName('');
      setPhone(defaultDialCode);
      setWishes('');
      if (typeof window !== 'undefined' && window.crypto) {
        try { navigator.clipboard?.writeText(''); } catch (_) {}
      }
    };
  }, [defaultDialCode]);

  // Загрузка залов со столами
  useEffect(() => {
    let isCancelled = false;
    const fetchZones = async () => {
      try {
        const data = await menuService.getReservationZones(restaurantSlug);
        if (!isCancelled && data && Array.isArray(data)) {
          setFullZones(data);
          if (data.length > 0 && !selectedZoneId) {
            setSelectedZoneId(String(data[0].id));
          }
        }
      } catch (err) {
        console.error('Failed to load reservation zones:', err);
      }
    };
    fetchZones();
    return () => { isCancelled = true; };
  }, [restaurantSlug]);

  // Загрузка доступных слотов
  useEffect(() => {
    let isCancelled = false;
    const fetchSlots = async () => {
      setIsLoadingSlots(true);
      setErrorMsg('');
      try {
        const data = await menuService.getReservationSlots(
          restaurantSlug,
          date,
          guestsCount,
          selectedZoneId ? Number(selectedZoneId) : null
        );
        if (isCancelled) return;

        if (data && data.zones) setZones(data.zones);
        const slots = data?.slots || [];
        setAvailableSlots(slots);
        
        const firstFree = slots.find((s) => s.is_available);
        if (firstFree) {
          setSelectedTime(firstFree.time);
          setSelectedSlotEnd(firstFree.end_time);
          if (!suggestedTableId) {
            setSuggestedTableId(firstFree.suggested_table_id);
          }
        } else {
          setSelectedTime('');
          setSelectedSlotEnd('');
          setSuggestedTableId(null);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to load reservation slots:', err);
          setErrorMsg('Не удалось загрузить расписание. Попробуйте другую дату.');
        }
      } finally {
        if (!isCancelled) setIsLoadingSlots(false);
      }
    };

    fetchSlots();
    return () => { isCancelled = true; };
  }, [restaurantSlug, date, guestsCount, selectedZoneId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || phone.replace(/\D/g, '').length < 7) {
      alert('Пожалуйста, укажите имя и корректный контактный номер телефона');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const source = window.location.pathname.includes('kiosk') ? 'KIOSK_STREET' : 'MOBILE_QR';
      const result = await menuService.createReservation({
        restaurant_slug: restaurantSlug,
        reservation_date: date,
        start_time: selectedTime,
        guests_count: guestsCount,
        zone_id: selectedZoneId ? Number(selectedZoneId) : undefined,
        table_id: suggestedTableId || undefined,
        guest_name: name.trim(),
        guest_phone: phone.trim(),
        guest_wishes: wishes.trim() || undefined,
        source
      });

      if (result && result.status === 'success') {
        setBookingResult(result);
        setStep(3);
      } else {
        setErrorMsg(result?.message || 'Не удалось забронировать стол');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Ошибка соединения с сервером');
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
        backgroundColor: 'rgba(5, 5, 8, 0.88)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.25s ease'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '740px',
          maxHeight: '94vh',
          overflowY: 'auto',
          backgroundColor: '#111116',
          border: '1px solid var(--accent-gold)',
          borderRadius: '24px',
          padding: '28px 24px',
          color: '#fff',
          boxShadow: '0 24px 70px rgba(0, 0, 0, 0.95), 0 0 40px rgba(212, 175, 55, 0.2)',
          position: 'relative'
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 30
          }}
        >
          <X size={18} />
        </button>

        {/* ШАГ 3: УСПЕШНОЕ БРОНИРОВАНИЕ */}
        {step === 3 && bookingResult ? (
          <div style={{ textAlign: 'center', padding: '16px 4px' }}>
            <div
              style={{
                width: '74px',
                height: '74px',
                borderRadius: '50%',
                backgroundColor: 'rgba(212, 175, 55, 0.16)',
                border: '2px solid var(--accent-gold)',
                color: 'var(--accent-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 18px',
                boxShadow: '0 0 30px rgba(212, 175, 55, 0.3)'
              }}
            >
              <CheckCircle size={44} />
            </div>

            <span style={{ fontSize: '12px', color: 'var(--accent-gold)', fontWeight: '700', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Бронь подтверждена
            </span>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '30px', color: '#fff', margin: '6px 0 10px' }}>
              Ждём вас в гости!
            </h2>

            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(212, 175, 55, 0.35)',
                borderRadius: '18px',
                padding: '20px',
                margin: '18px 0',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Номер вашей брони
              </div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--accent-gold)', letterSpacing: '0.08em' }}>
                {bookingResult.booking_code}
              </div>
              <div style={{ fontSize: '14px', color: '#fff', marginTop: '4px', fontWeight: '600' }}>
                📅 {date} • {bookingResult.start_time} — {bookingResult.end_time}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                👥 {guestsCount} персоны {bookingResult.table_number ? `• Стол №${bookingResult.table_number}` : ''} {bookingResult.zone_name ? `(${bookingResult.zone_name})` : ''}
              </div>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6', margin: '0 auto 24px', maxWidth: '420px' }}>
              Хостес заведения <b>{restaurantName}</b> уже зарезервировала для вас место.
              Стол удерживается в течение <b>15 минут</b> от указанного времени.
            </p>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: '100%',
                background: 'var(--accent-gold-gradient)',
                border: 'none',
                borderRadius: '14px',
                padding: '14px',
                color: '#000',
                fontWeight: '700',
                fontSize: '15px',
                cursor: 'pointer'
              }}
            >
              Готово
            </button>
          </div>
        ) : step === 1 ? (
          /* ШАГ 1: ВЫБОР ДАТЫ, ПЕРСОН, ЗАЛА И ВРЕМЕНИ */
          <div>
            <div style={{ marginBottom: '18px' }}>
              <span style={{ fontSize: '11px', color: 'var(--accent-gold)', fontWeight: '700', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                Онлайн-бронирование
              </span>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', color: '#fff', margin: '4px 0 2px' }}>
                Бронирование стола или кабины
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                {restaurantName} • Выберите место на 3D-плане или выберите любой удобный столик списком
              </p>
            </div>

            {errorMsg && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5', padding: '10px 14px', borderRadius: '12px', fontSize: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 1. Количество персон */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>
                <span>Количество гостей:</span>
                <span style={{ color: 'var(--accent-gold)' }}>
                  {guestsCount <= 2 ? '⏱️ Сеанс 1.5 ч.' : guestsCount <= 5 ? '⏱️ Сеанс 2 ч.' : '⏱️ Сеанс 3 ч.'}
                </span>
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[1, 2, 3, 4, 5, 6, 8, 10, 15].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setGuestsCount(num)}
                    style={{
                      flex: '1 0 16%',
                      minWidth: '40px',
                      padding: '10px 0',
                      borderRadius: '12px',
                      border: guestsCount === num ? '1px solid var(--accent-gold)' : '1px solid rgba(255,255,255,0.1)',
                      background: guestsCount === num ? 'var(--accent-gold-gradient)' : 'rgba(255,255,255,0.04)',
                      color: guestsCount === num ? '#000' : '#fff',
                      fontWeight: '700',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Дата визита (Luxury Date Picker) */}
            <div style={{ marginBottom: '18px' }}>
              <LuxuryDatePicker
                label="Дата визита:"
                value={date}
                minDate={new Date().toISOString().split('T')[0]}
                onChange={(newDate) => setDate(newDate)}
                showPills={true}
                pillsCount={7}
              />
            </div>

            {/* 3. Интерактивная 3D-Карта с Zoom / Pan и списком столов */}
            {kioskUI.show_floor_plan !== false && (
              <div style={{ marginBottom: '18px' }}>
                <InteractiveFloorPlan
                  zones={fullZones.length > 0 ? fullZones : zones}
                  selectedZoneId={selectedZoneId ? Number(selectedZoneId) : (fullZones[0]?.id || zones[0]?.id)}
                  onSelectZone={(zId) => setSelectedZoneId(String(zId))}
                  tables={(fullZones.length > 0 ? fullZones : zones).flatMap((z) => z.tables || [])}
                  selectedTableId={suggestedTableId}
                  onSelectTable={(tId) => setSuggestedTableId(tId)}
                  guestsCount={guestsCount}
                  availableTableIds={availableSlots.find((s) => s.time === selectedTime)?.available_table_ids || []}
                  selectedTime={selectedTime}
                />
              </div>
            )}

            {/* 4. Сетка доступного времени */}
            <div style={{ marginBottom: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
                  Выберите время визита:
                </label>
                {isLoadingSlots && (
                  <span style={{ fontSize: '11px', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <RefreshCw size={12} className="animate-spin" />
                    <span>Проверка столов...</span>
                  </span>
                )}
              </div>

              {availableSlots.length === 0 && !isLoadingSlots ? (
                <div style={{ textAlign: 'center', padding: '20px 10px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                    На эту дату свободных столов нет.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', maxHeight: '130px', overflowY: 'auto' }}>
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!slot.is_available}
                      onClick={() => {
                        setSelectedTime(slot.time);
                        setSelectedSlotEnd(slot.end_time);
                        if (!suggestedTableId || (slot.available_table_ids && !slot.available_table_ids.includes(suggestedTableId))) {
                          setSuggestedTableId(slot.suggested_table_id);
                        }
                      }}
                      style={{
                        padding: '10px 4px',
                        borderRadius: '10px',
                        border: selectedTime === slot.time
                          ? '1px solid var(--accent-gold)'
                          : '1px solid rgba(255,255,255,0.06)',
                        background: selectedTime === slot.time
                          ? 'var(--accent-gold)'
                          : slot.is_available
                          ? 'rgba(255,255,255,0.04)'
                          : 'rgba(255,255,255,0.01)',
                        color: selectedTime === slot.time
                          ? '#000'
                          : slot.is_available
                          ? '#fff'
                          : 'rgba(255,255,255,0.2)',
                        cursor: slot.is_available ? 'pointer' : 'not-allowed',
                        fontWeight: '700',
                        fontSize: '13px',
                        textDecoration: slot.is_available ? 'none' : 'line-through',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={!selectedTime}
              onClick={() => setStep(2)}
              style={{
                width: '100%',
                background: selectedTime ? 'var(--accent-gold-gradient)' : 'rgba(255,255,255,0.08)',
                border: 'none',
                borderRadius: '14px',
                padding: '14px',
                color: selectedTime ? '#000' : 'rgba(255,255,255,0.3)',
                fontWeight: '700',
                fontSize: '15px',
                cursor: selectedTime ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: selectedTime ? '0 8px 24px rgba(212, 175, 55, 0.35)' : 'none'
              }}
            >
              <span>Продолжить ({selectedTime ? `${selectedTime} • ${guestsCount} чел.` : 'выберите время'})</span>
              <ChevronRight size={18} />
            </button>
          </div>
        ) : (
          /* ШАГ 2: КОНТАКТЫ ГОСТЯ */
          <form onSubmit={handleSubmit} autoComplete="off" noValidate>
            <div style={{ marginBottom: '18px' }}>
              <span style={{ fontSize: '11px', color: 'var(--accent-gold)', fontWeight: '700', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                Шаг 2 из 2
              </span>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', color: '#fff', margin: '4px 0 2px' }}>
                Контакты для подтверждения
              </h2>
              <div style={{ fontSize: '13px', color: 'var(--accent-gold)', marginTop: '4px', fontWeight: '600' }}>
                📅 {date} в {selectedTime} • {guestsCount} чел.
              </div>
            </div>

            {errorMsg && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5', padding: '10px 14px', borderRadius: '12px', fontSize: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>
                  Ваше имя: *
                </label>
                <input
                  type="text"
                  name="guest_kiosk_name"
                  autoComplete="new-password"
                  autoCorrect="off"
                  spellCheck="false"
                  required
                  placeholder="Имя Фамилия"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    color: '#fff',
                    fontSize: '15px',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>
                  Номер телефона: *
                </label>
                <input
                  type="tel"
                  name="guest_kiosk_phone"
                  autoComplete="new-password"
                  autoCorrect="off"
                  spellCheck="false"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    color: 'var(--accent-gold)',
                    fontSize: '16px',
                    fontWeight: '700',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>
                  Пожелания (кабинка, годовщина, детский стул...):
                </label>
                <input
                  type="text"
                  name="guest_kiosk_wishes"
                  autoComplete="new-password"
                  autoCorrect="off"
                  spellCheck="false"
                  placeholder="Например: тихий угол, годовщина свадьбы"
                  value={wishes}
                  onChange={(e) => setWishes(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '14px 20px',
                  color: '#fff',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Назад
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  flex: 1,
                  background: 'var(--accent-gold-gradient)',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '14px',
                  color: '#000',
                  fontWeight: '700',
                  fontSize: '15px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 8px 24px rgba(212, 175, 55, 0.35)'
                }}
              >
                {isSubmitting ? 'Бронирование...' : 'Забронировать'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
