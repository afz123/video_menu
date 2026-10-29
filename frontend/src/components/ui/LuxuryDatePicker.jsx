import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, Check, Sparkles } from 'lucide-react';

const MONTH_NAMES_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const MONTH_NAMES_GENITIVE_RU = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
];

const WEEKDAY_NAMES_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const WEEKDAY_FULL_RU = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

// Safe date helpers avoiding timezone shifts
const formatDateISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const parseISODate = (str) => {
  if (!str) return new Date();
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const LuxuryDatePicker = ({
  value,
  onChange,
  minDate = new Date().toISOString().split('T')[0],
  maxDate = null,
  label = 'Дата визита:',
  showPills = true,
  pillsCount = 7,
  compact = false
}) => {
  const containerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  const selectedDateObj = useMemo(() => parseISODate(value), [value]);

  // Calendar view month & year state
  const [viewYear, setViewYear] = useState(() => selectedDateObj.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => selectedDateObj.getMonth());

  // Sync view month when value changes
  useEffect(() => {
    setViewYear(selectedDateObj.getFullYear());
    setViewMonth(selectedDateObj.getMonth());
  }, [value]);

  // Close calendar popover on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const todayISO = useMemo(() => formatDateISO(new Date()), []);
  const tomorrowISO = useMemo(() => {
    const tom = new Date();
    tom.setDate(tom.getDate() + 1);
    return formatDateISO(tom);
  }, []);

  // Quick selection pills (today, tomorrow, next N days)
  const quickPills = useMemo(() => {
    const pills = [];
    const base = new Date();
    for (let i = 0; i < pillsCount; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const iso = formatDateISO(d);

      let labelText = '';
      if (iso === todayISO) labelText = 'Сегодня';
      else if (iso === tomorrowISO) labelText = 'Завтра';
      else labelText = WEEKDAY_NAMES_RU[d.getDay()];

      pills.push({
        iso,
        dateNum: d.getDate(),
        monthShort: MONTH_NAMES_GENITIVE_RU[d.getMonth()].slice(0, 3),
        weekday: WEEKDAY_NAMES_RU[d.getDay()],
        label: labelText,
        isWeekend: d.getDay() === 0 || d.getDay() === 6
      });
    }
    return pills;
  }, [pillsCount, todayISO, tomorrowISO]);

  // Calendar grid calculations
  const daysInMonth = useMemo(() => {
    return new Date(viewYear, viewMonth + 1, 0).getDate();
  }, [viewYear, viewMonth]);

  const firstDayWeekdayIndex = useMemo(() => {
    // 0 = Sunday, 1 = Monday in JS. We want 0 = Monday, ..., 6 = Sunday
    const jsDay = new Date(viewYear, viewMonth, 1).getDay();
    return (jsDay + 6) % 7;
  }, [viewYear, viewMonth]);

  const prevMonthDays = useMemo(() => {
    const prevDate = new Date(viewYear, viewMonth, 0);
    const totalPrevDays = prevDate.getDate();
    const result = [];
    for (let i = firstDayWeekdayIndex - 1; i >= 0; i--) {
      result.push(totalPrevDays - i);
    }
    return result;
  }, [viewYear, viewMonth, firstDayWeekdayIndex]);

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (dayNum) => {
    const d = new Date(viewYear, viewMonth, dayNum);
    const iso = formatDateISO(d);
    onChange(iso);
    setIsOpen(false);
  };

  const isDateDisabled = (dayNum) => {
    const targetISO = formatDateISO(new Date(viewYear, viewMonth, dayNum));
    if (minDate && targetISO < minDate) return true;
    if (maxDate && targetISO > maxDate) return true;
    return false;
  };

  const formattedSelectedText = useMemo(() => {
    if (!value) return 'Выберите дату';
    const day = selectedDateObj.getDate();
    const month = MONTH_NAMES_GENITIVE_RU[selectedDateObj.getMonth()];
    const weekday = WEEKDAY_FULL_RU[selectedDateObj.getDay()];
    const year = selectedDateObj.getFullYear();

    if (compact) {
      if (value === todayISO) return `Сегодня (${day} ${month.slice(0, 3)})`;
      if (value === tomorrowISO) return `Завтра (${day} ${month.slice(0, 3)})`;
      return `${day} ${month.slice(0, 3)} ${year}`;
    }

    if (value === todayISO) {
      return `Сегодня, ${day} ${month} (${weekday})`;
    }
    if (value === tomorrowISO) {
      return `Завтра, ${day} ${month} (${weekday})`;
    }
    return `${day} ${month} ${year}, ${weekday}`;
  }, [value, selectedDateObj, todayISO, tomorrowISO, compact]);

  if (compact) {
    return (
      <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: isOpen ? '1px solid var(--accent-gold)' : '1px solid rgba(212, 175, 55, 0.35)',
            borderRadius: '10px',
            padding: '8px 14px',
            color: '#fff',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            outline: 'none',
            boxShadow: isOpen ? '0 0 12px rgba(212, 175, 55, 0.25)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <CalendarIcon size={14} style={{ color: 'var(--accent-gold)' }} />
          <span>{formattedSelectedText}</span>
          <ChevronDown
            size={14}
            style={{
              color: 'var(--accent-gold)',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }}
          />
        </button>

        {isOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              zIndex: 200,
              width: '320px',
              backgroundColor: '#111116',
              border: '1px solid rgba(212, 175, 55, 0.4)',
              borderRadius: '16px',
              padding: '16px',
              color: '#fff',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.95), 0 0 35px rgba(212, 175, 55, 0.2)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <button
                type="button"
                onClick={handlePrevMonth}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'var(--accent-gold)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: '15px', fontWeight: '600' }}>
                {MONTH_NAMES_RU[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'var(--accent-gold)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Weekdays */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center', marginBottom: '6px' }}>
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((wd, idx) => (
                <div key={wd} style={{ fontSize: '10px', fontWeight: '700', color: idx >= 5 ? 'var(--accent-gold)' : 'rgba(255, 255, 255, 0.4)' }}>
                  {wd}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
              {prevMonthDays.map((d, i) => (
                <div key={`prev-${i}`} style={{ padding: '6px 0', textAlign: 'center', fontSize: '11px', color: 'rgba(255, 255, 255, 0.15)' }}>
                  {d}
                </div>
              ))}

              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((dayNum) => {
                const currentISO = formatDateISO(new Date(viewYear, viewMonth, dayNum));
                const isSelected = value === currentISO;
                const isToday = currentISO === todayISO;
                const disabled = isDateDisabled(dayNum);

                return (
                  <button
                    key={dayNum}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleSelectDay(dayNum)}
                    style={{
                      padding: '6px 0',
                      borderRadius: '8px',
                      textAlign: 'center',
                      fontSize: '12px',
                      fontWeight: isSelected ? '700' : '500',
                      background: isSelected ? 'var(--accent-gold-gradient)' : isToday ? 'rgba(212, 175, 55, 0.12)' : 'transparent',
                      border: isSelected ? '1px solid var(--accent-gold)' : isToday ? '1px dashed var(--accent-gold)' : '1px solid transparent',
                      color: isSelected ? '#000' : disabled ? 'rgba(255, 255, 255, 0.15)' : isToday ? 'var(--accent-gold)' : '#fff',
                      cursor: disabled ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <button
                type="button"
                onClick={() => { onChange(todayISO); setIsOpen(false); }}
                style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#fff', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}
              >
                Сегодня
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--accent-gold)', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
              >
                Закрыть
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.03em' }}>
            {label}
          </label>
          {value === todayISO && (
            <span
              style={{
                fontSize: '11px',
                color: 'var(--accent-gold)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: '600'
              }}
            >
              <Sparkles size={12} />
              <span>Ближайший визит</span>
            </span>
          )}
        </div>
      )}

      {/* Main Luxury Date Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          width: '100%',
          backgroundColor: 'rgba(255, 255, 255, 0.04)',
          border: isOpen ? '1px solid var(--accent-gold)' : '1px solid rgba(212, 175, 55, 0.35)',
          borderRadius: '14px',
          padding: '12px 16px',
          color: '#fff',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          outline: 'none',
          boxShadow: isOpen
            ? '0 0 20px rgba(212, 175, 55, 0.2), inset 0 1px 3px rgba(0,0,0,0.5)'
            : 'inset 0 2px 4px rgba(0,0,0,0.4)',
          transition: 'all 0.2s ease',
          marginBottom: showPills ? '10px' : '0'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'rgba(212, 175, 55, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-gold)',
              flexShrink: 0
            }}
          >
            <CalendarIcon size={16} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ color: '#fff', fontWeight: '600', fontSize: '14px', lineHeight: '1.2' }}>
              {formattedSelectedText}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>
              Нажмите для выбора другого дня в календаре
            </div>
          </div>
        </div>

        <div
          style={{
            color: 'var(--accent-gold)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }}
        >
          <ChevronDown size={18} />
        </div>
      </button>

      {/* Quick Date Pills Horizontal Strip */}
      {showPills && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '4px',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          {quickPills.map((pill) => {
            const isSelected = value === pill.iso;
            return (
              <button
                key={pill.iso}
                type="button"
                onClick={() => onChange(pill.iso)}
                style={{
                  flex: '1 0 68px',
                  minWidth: '68px',
                  padding: '8px 6px',
                  borderRadius: '12px',
                  textAlign: 'center',
                  background: isSelected
                    ? 'var(--accent-gold-gradient)'
                    : 'rgba(255, 255, 255, 0.03)',
                  border: isSelected
                    ? '1px solid var(--accent-gold)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  color: isSelected ? '#000' : '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 4px 14px rgba(212, 175, 55, 0.35)' : 'none'
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    color: isSelected
                      ? '#000'
                      : pill.isWeekend
                      ? 'var(--accent-gold)'
                      : 'rgba(255, 255, 255, 0.5)',
                    marginBottom: '2px',
                    letterSpacing: '0.04em'
                  }}
                >
                  {pill.label}
                </div>
                <div style={{ fontSize: '16px', fontWeight: '800', lineHeight: '1.2' }}>
                  {pill.dateNum}
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    color: isSelected ? '#000' : 'rgba(255, 255, 255, 0.5)',
                    fontWeight: '500'
                  }}
                >
                  {pill.monthShort}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Floating Luxury Calendar Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 150,
            backgroundColor: '#111116',
            border: '1px solid rgba(212, 175, 55, 0.4)',
            borderRadius: '18px',
            padding: '18px',
            color: '#fff',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(212, 175, 55, 0.18)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)'
          }}
        >
          {/* Calendar Header with Navigation */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}
          >
            <button
              type="button"
              onClick={handlePrevMonth}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'var(--accent-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <ChevronLeft size={18} />
            </button>

            <div style={{ textAlign: 'center' }}>
              <span
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#fff'
                }}
              >
                {MONTH_NAMES_RU[viewMonth]} {viewYear}
              </span>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'var(--accent-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Weekday Names Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '4px',
              textAlign: 'center',
              marginBottom: '8px'
            }}
          >
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((wd, idx) => (
              <div
                key={wd}
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  color: idx >= 5 ? 'var(--accent-gold)' : 'rgba(255, 255, 255, 0.4)',
                  padding: '4px 0'
                }}
              >
                {wd}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '4px'
            }}
          >
            {/* Previous month fill days */}
            {prevMonthDays.map((d, i) => (
              <div
                key={`prev-${i}`}
                style={{
                  padding: '8px 0',
                  textAlign: 'center',
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.15)',
                  cursor: 'default'
                }}
              >
                {d}
              </div>
            ))}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((dayNum) => {
              const currentISO = formatDateISO(new Date(viewYear, viewMonth, dayNum));
              const isSelected = value === currentISO;
              const isToday = currentISO === todayISO;
              const disabled = isDateDisabled(dayNum);

              return (
                <button
                  key={dayNum}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleSelectDay(dayNum)}
                  style={{
                    padding: '8px 0',
                    borderRadius: '10px',
                    textAlign: 'center',
                    fontSize: '13px',
                    fontWeight: isSelected ? '700' : '500',
                    background: isSelected
                      ? 'var(--accent-gold-gradient)'
                      : isToday
                      ? 'rgba(212, 175, 55, 0.12)'
                      : 'transparent',
                    border: isSelected
                      ? '1px solid var(--accent-gold)'
                      : isToday
                      ? '1px dashed var(--accent-gold)'
                      : '1px solid transparent',
                    color: isSelected
                      ? '#000'
                      : disabled
                      ? 'rgba(255, 255, 255, 0.15)'
                      : isToday
                      ? 'var(--accent-gold)'
                      : '#fff',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    position: 'relative',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 0 12px rgba(212, 175, 55, 0.45)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!disabled && !isSelected) {
                      e.currentTarget.style.backgroundColor = 'rgba(212, 175, 55, 0.15)';
                      e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!disabled && !isSelected) {
                      e.currentTarget.style.backgroundColor = isToday ? 'rgba(212, 175, 55, 0.12)' : 'transparent';
                      e.currentTarget.style.borderColor = isToday ? 'var(--accent-gold)' : 'transparent';
                    }
                  }}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* Quick Footer Shortcuts */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '16px',
              paddingTop: '12px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  onChange(todayISO);
                  setIsOpen(false);
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#fff',
                  borderRadius: '8px',
                  padding: '5px 10px',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                Сегодня
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(tomorrowISO);
                  setIsOpen(false);
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#fff',
                  borderRadius: '8px',
                  padding: '5px 10px',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                Завтра
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent-gold)',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                padding: '4px 8px'
              }}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
