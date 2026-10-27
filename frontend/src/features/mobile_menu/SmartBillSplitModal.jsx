import React, { useState, useMemo } from 'react';
import { X, UserPlus, Check, Users, Sparkles, Copy, Trash2, Edit2, CheckCheck } from 'lucide-react';

export const SmartBillSplitModal = ({
  cartItems = [],
  currency = 'TJS',
  serviceChargePercent = 10,
  tipPercent = 0,
  onClose
}) => {
  // Список гостей за столом (по умолчанию 2 человека)
  const [guests, setGuests] = useState([
    { id: 'g1', name: 'Гость 1' },
    { id: 'g2', name: 'Гость 2' }
  ]);

  const [activeGuestId, setActiveGuestId] = useState('g1');
  const [editingGuestId, setEditingGuestId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [copied, setCopied] = useState(false);

  // Карта распределения: { [itemUid]: guestId }
  // Если позиции нет в карте — она считается «ОБЩИМ БЛЮДОМ» и делится поровну!
  const [itemAssignments, setItemAssignments] = useState({});

  // Разворачиваем позиции поштучно (если заказано 2 стейка, каждый можно отдать разным людям)
  const flattenedItems = useMemo(() => {
    const list = [];
    cartItems.forEach((item, itemIdx) => {
      const qty = item.quantity || 1;
      const baseName = typeof item.dish?.name === 'object'
        ? (item.dish.name.ru || Object.values(item.dish.name)[0] || 'Блюдо')
        : (item.dish?.name || item.name || 'Блюдо');
      
      // Безопасное извлечение имени опции из любой схемы модификатора
      const optionsText = item.chosenOptions?.length
        ? item.chosenOptions.map((o) => (typeof o === 'string' ? o : o.optionName || o.name || '')).filter(Boolean).join(' • ')
        : null;

      for (let i = 0; i < qty; i++) {
        list.push({
          uid: `${item.dish?.id || itemIdx}_${i}`,
          dishId: item.dish?.id,
          name: qty > 1 ? `${baseName} (#${i + 1})` : baseName,
          baseName,
          optionsText,
          price: Number(item.totalPrice || item.price || 0)
        });
      }
    });
    return list;
  }, [cartItems]);

  // Добавить нового гостя за стол (макс 8)
  const handleAddGuest = () => {
    if (guests.length >= 8) return;
    const nextNum = guests.length + 1;
    const newGuest = { id: `g${Date.now()}`, name: `Гость ${nextNum}` };
    setGuests([...guests, newGuest]);
    setActiveGuestId(newGuest.id);
  };

  // Удалить гостя
  const handleRemoveGuest = (guestId, e) => {
    if (e) e.stopPropagation();
    if (guests.length <= 1) return;
    setGuests(guests.filter((g) => g.id !== guestId));
    // Сбрасываем назначения удаленного гостя в "Общее"
    const updated = { ...itemAssignments };
    Object.keys(updated).forEach((k) => {
      if (updated[k] === guestId) delete updated[k];
    });
    setItemAssignments(updated);
    if (activeGuestId === guestId) {
      const remaining = guests.filter((g) => g.id !== guestId);
      setActiveGuestId(remaining[0]?.id || '');
    }
  };

  // Начать редактирование имени гостя
  const handleStartRename = (guest, e) => {
    if (e) e.stopPropagation();
    setEditingGuestId(guest.id);
    setEditingName(guest.name);
  };

  const handleSaveRename = (guestId) => {
    if (editingName.trim()) {
      setGuests((prev) =>
        prev.map((g) => (g.id === guestId ? { ...g, name: editingName.trim() } : g))
      );
    }
    setEditingGuestId(null);
  };

  // Назначить блюдо активному гостю (или снять в "Общее")
  const toggleItemAssignment = (itemUid) => {
    setItemAssignments((prev) => {
      const currentOwner = prev[itemUid];
      if (currentOwner === activeGuestId) {
        // Если уже мое — снимаем в статус "Общее"
        const next = { ...prev };
        delete next[itemUid];
        return next;
      } else {
        // Назначаем текущему активному гостю
        return { ...prev, [itemUid]: activeGuestId };
      }
    });
  };

  // Сбросить всё в общий стол
  const handleResetToShared = () => {
    setItemAssignments({});
  };

  // Математический расчет: кто сколько должен
  const calculation = useMemo(() => {
    let sharedPoolTotal = 0;
    const guestTotals = {};
    guests.forEach((g) => {
      guestTotals[g.id] = { personalSum: 0, itemsCount: 0, items: [] };
    });

    const sharedItems = [];

    flattenedItems.forEach((item) => {
      const assignedTo = itemAssignments[item.uid];
      if (assignedTo && guestTotals[assignedTo]) {
        guestTotals[assignedTo].personalSum += item.price;
        guestTotals[assignedTo].itemsCount += 1;
        guestTotals[assignedTo].items.push(item);
      } else {
        sharedPoolTotal += item.price;
        sharedItems.push(item);
      }
    });

    const guestsCount = Math.max(1, guests.length);
    const sharedPerPerson = sharedPoolTotal / guestsCount;
    const svcRate = Number(serviceChargePercent || 0) / 100;
    const tipRate = Number(tipPercent || 0) / 100;

    const breakdown = guests.map((g) => {
      const personal = guestTotals[g.id]?.personalSum || 0;
      const subtotal = personal + sharedPerPerson;
      const service = subtotal * svcRate;
      const tip = subtotal * tipRate;
      const total = subtotal + service + tip;

      return {
        ...g,
        personal,
        shared: sharedPerPerson,
        service,
        tip,
        itemsCount: guestTotals[g.id]?.itemsCount || 0,
        total: Math.round(total)
      };
    });

    return {
      sharedPoolTotal,
      sharedPerPerson,
      sharedItems,
      breakdown
    };
  }, [flattenedItems, itemAssignments, guests, serviceChargePercent, tipPercent]);

  // Копирование сводки счета в буфер обмена для отправки в групповой чат
  const handleCopySummary = () => {
    const lines = [
      '🧾 РАСЧЕТ СЧЕТА (Кто что ел + Общий стол):',
      '────────────────────────────'
    ];

    calculation.breakdown.forEach((g) => {
      lines.push(
        `• ${g.name}: ${g.total} ${currency} (личные: ${g.personal} + общий стол: ${Math.round(g.shared)})`
      );
    });

    if (calculation.sharedPoolTotal > 0) {
      lines.push('────────────────────────────');
      lines.push(
        `👥 Общий стол: ${calculation.sharedPoolTotal} ${currency} (${Math.round(calculation.sharedPerPerson)} ${currency}/чел)`
      );
    }

    if (serviceChargePercent > 0 || tipPercent > 0) {
      const extras = [];
      if (serviceChargePercent > 0) extras.push(`обслуживание ${serviceChargePercent}%`);
      if (tipPercent > 0) extras.push(`чаевые ${tipPercent}%`);
      lines.push(`Включено: ${extras.join(' + ')}`);
    }

    const textToCopy = lines.join('\n');
    navigator.clipboard?.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const activeGuest = guests.find((g) => g.id === activeGuestId) || guests[0];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        backgroundColor: 'rgba(5, 5, 8, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '92vh',
          backgroundColor: '#111116',
          border: '1px solid var(--accent-gold)',
          borderRadius: '24px',
          padding: '22px',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.9), 0 0 35px rgba(212, 175, 55, 0.25)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Шапка модального окна */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={13} color="var(--accent-gold)" />
              <span style={{ fontSize: '11px', color: 'var(--accent-gold)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Раздельный счет
              </span>
            </div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', color: '#fff', margin: '2px 0 0' }}>
              Кто что ел?
            </h2>
            <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.55)', margin: '2px 0 0' }}>
              Отметьте личные блюда каждого гостя — остальное разделится поровну
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Закрыть"
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
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* 1. Селектор персон за столом */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '12px', scrollbarWidth: 'none' }}>
          {guests.map((g) => {
            const isSelected = activeGuestId === g.id;
            const isEditing = editingGuestId === g.id;
            const assignedCount = Object.values(itemAssignments).filter((id) => id === g.id).length;

            return (
              <div
                key={g.id}
                onClick={() => {
                  if (!isEditing) setActiveGuestId(g.id);
                }}
                style={{
                  background: isSelected ? 'var(--accent-gold-gradient)' : 'rgba(255, 255, 255, 0.05)',
                  color: isSelected ? '#000' : '#fff',
                  border: isSelected ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '14px',
                  padding: '7px 12px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  flexShrink: 0
                }}
              >
                {isEditing ? (
                  <input
                    type="text"
                    value={editingName}
                    autoFocus
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRename(g.id);
                      if (e.key === 'Escape') setEditingGuestId(null);
                    }}
                    onBlur={() => handleSaveRename(g.id)}
                    style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      color: isSelected ? '#000' : '#fff',
                      border: '1px solid rgba(0,0,0,0.4)',
                      borderRadius: '6px',
                      padding: '2px 6px',
                      fontSize: '12px',
                      fontWeight: '700',
                      width: '80px',
                      outline: 'none'
                    }}
                  />
                ) : (
                  <span
                    title="Двойной клик для смены имени"
                    onDoubleClick={(e) => handleStartRename(g, e)}
                  >
                    {g.name}
                  </span>
                )}

                {/* Бейдж количества позиций */}
                <span
                  style={{
                    backgroundColor: isSelected ? 'rgba(0,0,0,0.2)' : 'rgba(212, 175, 55, 0.2)',
                    color: isSelected ? '#000' : 'var(--accent-gold)',
                    borderRadius: '8px',
                    padding: '1px 6px',
                    fontSize: '11px',
                    fontWeight: '800'
                  }}
                >
                  {assignedCount} поз.
                </span>

                {/* Иконка переименования */}
                {!isEditing && isSelected && (
                  <button
                    type="button"
                    onClick={(e) => handleStartRename(g, e)}
                    title="Изменить имя"
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '2px',
                      color: '#000',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      opacity: 0.65
                    }}
                  >
                    <Edit2 size={11} />
                  </button>
                )}

                {/* Удаление гостя (если их > 1) */}
                {guests.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => handleRemoveGuest(g.id, e)}
                    title="Удалить участника"
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '2px',
                      color: isSelected ? '#000' : 'rgba(255,255,255,0.4)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      marginLeft: '2px'
                    }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            );
          })}

          {guests.length < 8 && (
            <button
              type="button"
              onClick={handleAddGuest}
              style={{
                background: 'rgba(212, 175, 55, 0.12)',
                border: '1px dashed var(--accent-gold)',
                color: 'var(--accent-gold)',
                borderRadius: '14px',
                padding: '7px 12px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              <UserPlus size={14} />
              <span>+ Гость</span>
            </button>
          )}
        </div>

        {/* Подсказка активного выбора */}
        <div
          style={{
            backgroundColor: 'rgba(212, 175, 55, 0.08)',
            borderRadius: '12px',
            padding: '8px 12px',
            marginBottom: '10px',
            border: '1px solid rgba(212, 175, 55, 0.2)',
            fontSize: '12px',
            color: '#cbd5e1',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            👉 Выберите блюда <b>{activeGuest?.name}</b>. Блюда с пометкой{' '}
            <span style={{ color: 'var(--accent-gold)', fontWeight: '700' }}>«Общее»</span>{' '}
            разделятся поровну.
          </div>
          {Object.keys(itemAssignments).length > 0 && (
            <button
              type="button"
              onClick={handleResetToShared}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.5)',
                fontSize: '11px',
                cursor: 'pointer',
                textDecoration: 'underline',
                whiteSpace: 'nowrap',
                marginLeft: '8px'
              }}
            >
              Сбросить всё
            </button>
          )}
        </div>

        {/* 2. Список блюд для отметки */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            paddingRight: '4px',
            marginBottom: '14px'
          }}
        >
          {flattenedItems.map((item) => {
            const ownerId = itemAssignments[item.uid];
            const isMine = ownerId === activeGuestId;
            const isShared = !ownerId;
            const ownerName = guests.find((g) => g.id === ownerId)?.name;

            return (
              <div
                key={item.uid}
                onClick={() => toggleItemAssignment(item.uid)}
                style={{
                  backgroundColor: isMine
                    ? 'rgba(212, 175, 55, 0.16)'
                    : isShared
                    ? 'rgba(255, 255, 255, 0.03)'
                    : 'rgba(255, 255, 255, 0.015)',
                  border: isMine
                    ? '1.5px solid var(--accent-gold)'
                    : isShared
                    ? '1px dashed rgba(212, 175, 55, 0.35)'
                    : '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ flex: 1, paddingRight: '8px' }}>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: isMine ? '#fff' : 'rgba(255,255,255,0.88)'
                    }}
                  >
                    {item.name}
                  </div>
                  {item.optionsText && (
                    <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '2px' }}>
                      {item.optionsText}
                    </div>
                  )}
                  <div style={{ fontSize: '11px', marginTop: '3px' }}>
                    {isShared ? (
                      <span style={{ color: 'var(--accent-gold)', fontWeight: '600' }}>
                        👥 Общий стол (поровну на всех)
                      </span>
                    ) : isMine ? (
                      <span style={{ color: '#4ade80', fontWeight: '700' }}>
                        ✓ Выбрано: {activeGuest?.name}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>
                        В чеке: <strong>{ownerName}</strong> (нажмите, чтобы забрать)
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--accent-gold)' }}>
                    {item.price} {currency}
                  </span>

                  {/* Чекбокс индикатор */}
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '7px',
                      backgroundColor: isMine ? 'var(--accent-gold)' : 'rgba(255,255,255,0.06)',
                      border: isMine ? 'none' : '1px solid rgba(255,255,255,0.2)',
                      color: '#000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {isMine && <Check size={15} strokeWidth={3} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 3. Итоговая сводка: точная сумма на каждого человека */}
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '12px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}
          >
            <span
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              Итог к оплате по персонам
              {serviceChargePercent > 0 && ` (сервис ${serviceChargePercent}%)`}
              {tipPercent > 0 && ` (+ чай ${tipPercent}%)`}:
            </span>
            <button
              type="button"
              onClick={handleCopySummary}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                padding: '3px 8px',
                color: copied ? '#4ade80' : 'var(--accent-gold)',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {copied ? <CheckCheck size={12} /> : <Copy size={12} />}
              <span>{copied ? 'Скопировано!' : 'Копировать в чат'}</span>
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '8px',
              maxHeight: '120px',
              overflowY: 'auto',
              marginBottom: '12px'
            }}
          >
            {calculation.breakdown.map((g) => (
              <div
                key={g.id}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(212, 175, 55, 0.25)',
                  borderRadius: '12px',
                  padding: '8px 10px',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
                  {g.name}
                </div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--accent-gold)', marginTop: '2px' }}>
                  {g.total} {currency}
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>
                  своё: {g.personal} + общ: {Math.round(g.shared)}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '100%',
              background: 'var(--accent-gold-gradient)',
              border: 'none',
              borderRadius: '12px',
              padding: '12px',
              color: '#09090b',
              fontWeight: '700',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};
