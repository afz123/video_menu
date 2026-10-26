import React, { useState, useEffect, useCallback } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { menuService } from '../../services/menuService';
import {
  Calendar, Clock, Users, Phone, CheckCircle, XCircle,
  AlertCircle, Search, RefreshCw, UserCheck, PhoneCall,
  UserX, Filter, Eye, Sparkles, MapPin, Check, Ban,
  Plus, Edit2, Trash2, Layers, LayoutGrid, CheckSquare
} from 'lucide-react';

export const ReservationManager = ({ restaurantSlug }) => {
  const [activeView, setActiveView] = useState('reservations'); // 'reservations' | 'tables_and_zones'
  const [reservations, setReservations] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Tables & Zones State
  const [zones, setZones] = useState([]);
  const [isLoadingZones, setIsLoadingZones] = useState(false);
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [editingTable, setEditingTable] = useState(null);

  // Form states for Zone modal
  const [zoneName, setZoneName] = useState('');
  const [zoneDesc, setZoneDesc] = useState('');
  const [zoneOrder, setZoneOrder] = useState(0);

  // Form states for Table modal
  const [tableNumber, setTableNumber] = useState('');
  const [tableZoneId, setTableZoneId] = useState('');
  const [tableMinCap, setTableMinCap] = useState(2);
  const [tableMaxCap, setTableMaxCap] = useState(4);
  const [tableShape, setTableShape] = useState('square');
  const [tableIsActive, setTableIsActive] = useState(true);

  // 1. Load Reservations
  const loadReservations = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const data = await menuService.getAdminReservations(
        restaurantSlug,
        selectedDate,
        statusFilter === 'ALL' ? null : statusFilter
      );
      setReservations(data || []);
    } catch (err) {
      console.error('Failed to load reservations:', err);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [restaurantSlug, selectedDate, statusFilter]);

  // 2. Load Zones and Tables
  const loadZonesAndTables = useCallback(async () => {
    setIsLoadingZones(true);
    try {
      const data = await menuService.getReservationZones(restaurantSlug);
      setZones(data || []);
    } catch (err) {
      console.error('Failed to load zones and tables:', err);
    } finally {
      setIsLoadingZones(false);
    }
  }, [restaurantSlug]);

  useEffect(() => {
    loadReservations();
    loadZonesAndTables();
    const interval = setInterval(() => {
      loadReservations(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [loadReservations, loadZonesAndTables]);

  const handleUpdateStatus = async (id, newStatus) => {
    setActionLoadingId(id);
    try {
      await menuService.updateReservationStatus(id, newStatus);
      await loadReservations(true);
    } catch (err) {
      alert('Ошибка обновления статуса брони: ' + (err.message || 'Ошибка'));
    } finally {
      setActionLoadingId(null);
    }
  };

  // Zone handlers
  const handleOpenZoneModal = (zone = null) => {
    if (zone) {
      setEditingZone(zone);
      setZoneName(zone.name);
      setZoneDesc(zone.description || '');
      setZoneOrder(zone.display_order || 0);
    } else {
      setEditingZone(null);
      setZoneName('');
      setZoneDesc('');
      setZoneOrder(zones.length + 1);
    }
    setIsZoneModalOpen(true);
  };

  const handleSaveZone = async (e) => {
    e.preventDefault();
    if (!zoneName.trim()) {
      alert('Укажите название зала/зоны');
      return;
    }
    try {
      if (editingZone) {
        await menuService.updateZone(editingZone.id, {
          name: zoneName.trim(),
          description: zoneDesc.trim(),
          display_order: Number(zoneOrder)
        });
      } else {
        await menuService.createZone(restaurantSlug, {
          name: zoneName.trim(),
          description: zoneDesc.trim(),
          display_order: Number(zoneOrder)
        });
      }
      setIsZoneModalOpen(false);
      await loadZonesAndTables();
    } catch (err) {
      alert('Ошибка сохранения зала: ' + err.message);
    }
  };

  const handleDeleteZone = async (zoneId) => {
    if (!window.confirm('Удалить эту зону и все относящиеся к ней столы?')) return;
    try {
      await menuService.deleteZone(zoneId);
      await loadZonesAndTables();
    } catch (err) {
      alert('Ошибка удаления зоны: ' + err.message);
    }
  };

  // Table handlers
  const handleOpenTableModal = (tbl = null, defaultZoneId = null) => {
    if (tbl) {
      setEditingTable(tbl);
      setTableNumber(tbl.table_number);
      setTableZoneId(tbl.zone_id || zones[0]?.id || '');
      setTableMinCap(tbl.min_capacity);
      setTableMaxCap(tbl.max_capacity);
      setTableShape(tbl.shape || 'square');
      setTableIsActive(tbl.is_active);
    } else {
      setEditingTable(null);
      setTableNumber('');
      setTableZoneId(defaultZoneId || zones[0]?.id || '');
      setTableMinCap(2);
      setTableMaxCap(4);
      setTableShape('square');
      setTableIsActive(true);
    }
    setIsTableModalOpen(true);
  };

  const handleSaveTable = async (e) => {
    e.preventDefault();
    if (!tableNumber.trim() || !tableZoneId) {
      alert('Укажите номер стола и выберите зал');
      return;
    }
    try {
      if (editingTable) {
        await menuService.updateTable(editingTable.id, {
          table_number: tableNumber.trim(),
          zone_id: Number(tableZoneId),
          min_capacity: Number(tableMinCap),
          max_capacity: Number(tableMaxCap),
          shape: tableShape,
          is_active: tableIsActive
        });
      } else {
        await menuService.createTable(restaurantSlug, {
          table_number: tableNumber.trim(),
          zone_id: Number(tableZoneId),
          min_capacity: Number(tableMinCap),
          max_capacity: Number(tableMaxCap),
          shape: tableShape,
          is_active: tableIsActive
        });
      }
      setIsTableModalOpen(false);
      await loadZonesAndTables();
    } catch (err) {
      alert('Ошибка сохранения стола: ' + err.message);
    }
  };

  const handleToggleTableActive = async (tbl) => {
    try {
      await menuService.updateTable(tbl.id, { is_active: !tbl.is_active });
      await loadZonesAndTables();
    } catch (err) {
      alert('Ошибка изменения активности стола: ' + err.message);
    }
  };

  const handleDeleteTable = async (tableId) => {
    if (!window.confirm('Удалить этот стол?')) return;
    try {
      await menuService.deleteTable(tableId);
      await loadZonesAndTables();
    } catch (err) {
      alert('Ошибка удаления стола: ' + err.message);
    }
  };

  const filtered = reservations.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (r.guest_name || '').toLowerCase().includes(q) ||
      (r.guest_phone || '').includes(q) ||
      (r.booking_code || '').toLowerCase().includes(q) ||
      (r.table_number || '').toLowerCase().includes(q)
    );
  });

  const counts = {
    all: reservations.length,
    pending: reservations.filter((r) => r.status === 'PENDING').length,
    confirmed: reservations.filter((r) => r.status === 'CONFIRMED').length,
    seated: reservations.filter((r) => r.status === 'SEATED').length
  };

  // Floor stats
  const totalTables = zones.reduce((acc, z) => acc + (z.tables?.length || 0), 0);
  const totalCapacity = zones.reduce(
    (acc, z) => acc + (z.tables || []).reduce((tAcc, t) => tAcc + (t.max_capacity || 0), 0),
    0
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 0. Переключатель режима: Журнал броней vs Схема столов */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => setActiveView('reservations')}
          style={{
            background: activeView === 'reservations' ? 'var(--accent-gold-gradient)' : 'rgba(255, 255, 255, 0.05)',
            color: activeView === 'reservations' ? '#000' : 'var(--text-muted)',
            border: activeView === 'reservations' ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '14px',
            padding: '10px 22px',
            fontSize: '14px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: activeView === 'reservations' ? '0 4px 16px rgba(212, 175, 55, 0.3)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <Calendar size={16} />
          <span>Журнал броней & Смена хостес</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('tables_and_zones')}
          style={{
            background: activeView === 'tables_and_zones' ? 'var(--accent-gold-gradient)' : 'rgba(255, 255, 255, 0.05)',
            color: activeView === 'tables_and_zones' ? '#000' : 'var(--text-muted)',
            border: activeView === 'tables_and_zones' ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '14px',
            padding: '10px 22px',
            fontSize: '14px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: activeView === 'tables_and_zones' ? '0 4px 16px rgba(212, 175, 55, 0.3)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <LayoutGrid size={16} />
          <span>Столы & Схема залов ({totalTables})</span>
        </button>
      </div>

      {/* РЕЖИМ 1: ЖУРНАЛ БРОНИРОВАНИЙ */}
      {activeView === 'reservations' && (
        <>
          {/* Верхний бар управления */}
          <GlassCard style={{ padding: '24px 28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-gold)', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                  <Calendar size={16} />
                  <span>Диспетчер Зала & Бронирования</span>
                </div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', color: '#fff', margin: '4px 0 0' }}>
                  Журнал резервов на {selectedDate}
                </h2>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#fff',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Сегодня
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(212, 175, 55, 0.35)',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => loadReservations(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(212, 175, 55, 0.25)',
                    color: 'var(--accent-gold)',
                    borderRadius: '10px',
                    padding: '8px 14px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                  <span>Обновить</span>
                </button>
              </div>
            </div>

            <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.07)', margin: '18px 0' }} />

            {/* Фильтры и быстрый поиск */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { id: 'ALL', label: `Все брони (${counts.all})` },
                  { id: 'PENDING', label: `Ожидают подтверждения (${counts.pending})`, alert: counts.pending > 0 },
                  { id: 'CONFIRMED', label: `Подтверждены (${counts.confirmed})` },
                  { id: 'SEATED', label: `Гости за столом (${counts.seated})` },
                  { id: 'COMPLETED', label: 'Завершены' },
                  { id: 'NO_SHOW', label: 'Не пришли' },
                  { id: 'CANCELLED', label: 'Отменены' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    style={{
                      background: statusFilter === tab.id
                        ? 'var(--accent-gold)'
                        : tab.alert
                        ? 'rgba(239, 68, 68, 0.25)'
                        : 'rgba(255, 255, 255, 0.04)',
                      color: statusFilter === tab.id
                        ? '#000'
                        : tab.alert
                        ? '#ef4444'
                        : '#fff',
                      border: tab.alert ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '20px',
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div style={{ position: 'relative', width: '250px' }}>
                <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Поиск по имени, номеру, коду..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '20px',
                    padding: '7px 12px 7px 34px',
                    color: '#fff',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </GlassCard>

          {/* Таблица бронирований */}
          <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Calendar size={44} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p style={{ fontSize: '16px', color: '#fff', marginBottom: '4px', fontWeight: '600' }}>
                  На выбранную дату броней не найдено
                </p>
                <p style={{ fontSize: '13px' }}>
                  Новые заявки с уличного киоска и онлайн-меню мгновенно появятся здесь
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '11px', background: 'rgba(255, 255, 255, 0.02)' }}>
                      <th style={{ padding: '16px 20px' }}>Код & Время</th>
                      <th style={{ padding: '16px 20px' }}>Гость & Контакты</th>
                      <th style={{ padding: '16px 20px' }}>Персон</th>
                      <th style={{ padding: '16px 20px' }}>Стол & Зал</th>
                      <th style={{ padding: '16px 20px' }}>Пожелания</th>
                      <th style={{ padding: '16px 20px' }}>Статус</th>
                      <th style={{ padding: '16px 20px', textAlign: 'right' }}>Действия хостес</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item) => (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                          backgroundColor: item.status === 'PENDING'
                            ? 'rgba(212, 175, 55, 0.06)'
                            : 'transparent',
                          transition: 'background 0.2s ease'
                        }}
                      >
                        {/* Код и время */}
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ fontWeight: '800', color: 'var(--accent-gold)', letterSpacing: '0.04em' }}>
                            {item.booking_code}
                          </div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginTop: '2px' }}>
                            {item.start_time} — {item.end_time}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>
                            {item.source === 'KIOSK_STREET' ? '🖥️ Уличный киоск' : '📱 Меню гостя'}
                          </div>
                        </td>

                        {/* Имя и телефон */}
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ fontWeight: '600', color: '#fff', fontSize: '14px' }}>
                            {item.guest_name}
                          </div>
                          <a
                            href={`tel:${item.guest_phone}`}
                            style={{ color: 'var(--accent-gold)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '4px', fontSize: '13px' }}
                          >
                            <PhoneCall size={12} />
                            <span>{item.guest_phone}</span>
                          </a>
                        </td>

                        {/* Персон */}
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ background: 'rgba(255, 255, 255, 0.06)', padding: '5px 10px', borderRadius: '12px', fontWeight: '700', color: '#fff' }}>
                            👥 {item.guests_count} чел.
                          </span>
                        </td>

                        {/* Назначенный стол */}
                        <td style={{ padding: '16px 20px' }}>
                          {item.table_number ? (
                            <div>
                              <span style={{ color: 'var(--accent-gold)', fontWeight: '700', fontSize: '13px' }}>
                                Стол №{item.table_number}
                              </span>
                              {item.zone_name && (
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  {item.zone_name}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>Автоподбор</span>
                          )}
                        </td>

                        {/* Пожелания */}
                        <td style={{ padding: '16px 20px', color: 'var(--text-muted)', maxWidth: '220px' }}>
                          {item.guest_wishes ? (
                            <span style={{ color: '#eee', fontStyle: 'italic', fontSize: '12px' }}>
                              «{item.guest_wishes}»
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>

                        {/* Статус бейдж */}
                        <td style={{ padding: '16px 20px' }}>
                          <span
                            style={{
                              padding: '5px 12px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: '800',
                              backgroundColor:
                                item.status === 'PENDING'
                                  ? 'rgba(234, 179, 8, 0.2)'
                                  : item.status === 'CONFIRMED'
                                  ? 'rgba(56, 189, 248, 0.2)'
                                  : item.status === 'SEATED'
                                  ? 'rgba(16, 185, 129, 0.2)'
                                  : item.status === 'NO_SHOW'
                                  ? 'rgba(239, 68, 68, 0.2)'
                                  : item.status === 'COMPLETED'
                                  ? 'rgba(148, 163, 184, 0.2)'
                                  : 'rgba(255, 255, 255, 0.08)',
                              color:
                                item.status === 'PENDING'
                                  ? '#eab308'
                                  : item.status === 'CONFIRMED'
                                  ? '#38bdf8'
                                  : item.status === 'SEATED'
                                  ? '#10b981'
                                  : item.status === 'NO_SHOW'
                                  ? '#ef4444'
                                  : item.status === 'COMPLETED'
                                  ? '#94a3b8'
                                  : 'var(--text-muted)'
                            }}
                          >
                            {item.status === 'PENDING' && 'Ожидает'}
                            {item.status === 'CONFIRMED' && 'Подтвержден'}
                            {item.status === 'SEATED' && 'За столом'}
                            {item.status === 'COMPLETED' && 'Завершен'}
                            {item.status === 'NO_SHOW' && 'Не явились'}
                            {item.status === 'CANCELLED' && 'Отменен'}
                          </span>
                        </td>

                        {/* Быстрые действия хостес */}
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            {item.status === 'PENDING' && (
                              <>
                                <button
                                  type="button"
                                  disabled={actionLoadingId === item.id}
                                  onClick={() => handleUpdateStatus(item.id, 'CONFIRMED')}
                                  title="Подтвердить бронь"
                                  style={{
                                    background: 'rgba(56, 189, 248, 0.15)',
                                    border: '1px solid #38bdf8',
                                    color: '#38bdf8',
                                    borderRadius: '8px',
                                    padding: '6px 12px',
                                    cursor: 'pointer',
                                    fontWeight: '700',
                                    fontSize: '12px'
                                  }}
                                >
                                  Подтвердить
                                </button>
                                <button
                                  type="button"
                                  disabled={actionLoadingId === item.id}
                                  onClick={() => handleUpdateStatus(item.id, 'CANCELLED')}
                                  title="Отклонить бронь"
                                  style={{
                                    background: 'rgba(239, 68, 68, 0.12)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    color: '#ef4444',
                                    borderRadius: '8px',
                                    padding: '6px 10px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Ban size={14} />
                                </button>
                              </>
                            )}

                            {item.status === 'CONFIRMED' && (
                              <>
                                <button
                                  type="button"
                                  disabled={actionLoadingId === item.id}
                                  onClick={() => handleUpdateStatus(item.id, 'SEATED')}
                                  title="Гости пришли и сели за стол"
                                  style={{
                                    background: 'var(--accent-gold-gradient)',
                                    border: 'none',
                                    color: '#000',
                                    borderRadius: '8px',
                                    padding: '6px 14px',
                                    cursor: 'pointer',
                                    fontWeight: '700',
                                    fontSize: '12px',
                                    boxShadow: '0 4px 12px rgba(212, 175, 55, 0.25)'
                                  }}
                                >
                                  Посадить
                                </button>
                                <button
                                  type="button"
                                  disabled={actionLoadingId === item.id}
                                  onClick={() => handleUpdateStatus(item.id, 'NO_SHOW')}
                                  title="Гости не пришли"
                                  style={{
                                    background: 'rgba(239, 68, 68, 0.12)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    color: '#ef4444',
                                    borderRadius: '8px',
                                    padding: '6px 10px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <UserX size={14} />
                                </button>
                              </>
                            )}

                            {item.status === 'SEATED' && (
                              <button
                                type="button"
                                disabled={actionLoadingId === item.id}
                                onClick={() => handleUpdateStatus(item.id, 'COMPLETED')}
                                title="Стол освободился"
                                style={{
                                  background: 'rgba(16, 185, 129, 0.18)',
                                  border: '1px solid #10b981',
                                  color: '#10b981',
                                  borderRadius: '8px',
                                  padding: '6px 12px',
                                  cursor: 'pointer',
                                  fontWeight: '700',
                                  fontSize: '12px'
                                }}
                              >
                                Освободить
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </>
      )}

      {/* РЕЖИМ 2: УПРАВЛЕНИЕ СТОЛАМИ И ЗАЛАМИ (ДИНАМИЧЕСКИЙ КОНСТРУКТОР) */}
      {activeView === 'tables_and_zones' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Верхняя карточка статистики и действий */}
          <GlassCard style={{ padding: '24px 28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-gold)', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                  <LayoutGrid size={16} />
                  <span>Управление залами & Физическими столами</span>
                </div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', color: '#fff', margin: '4px 0 6px' }}>
                  Схема залов заведения ({zones.length} зала, {totalTables} столов, {totalCapacity} мест)
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                  Все созданные здесь столы автоматически становятся доступны для бронирования гостями, QR-кодов и вызова персонала.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleOpenZoneModal(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    borderRadius: '12px',
                    padding: '10px 18px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Plus size={16} />
                  <span>Добавить зал</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenTableModal(null)}
                  style={{
                    background: 'var(--accent-gold-gradient)',
                    border: 'none',
                    color: '#000',
                    borderRadius: '12px',
                    padding: '10px 20px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 16px rgba(212, 175, 55, 0.35)'
                  }}
                >
                  <Plus size={16} />
                  <span>Добавить стол</span>
                </button>
              </div>
            </div>
          </GlassCard>

          {/* Список зон и столов */}
          {isLoadingZones ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--accent-gold)' }}>
              Загрузка залов и столов...
            </div>
          ) : zones.length === 0 ? (
            <GlassCard style={{ padding: '60px 20px', textAlign: 'center' }}>
              <LayoutGrid size={44} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
              <h3 style={{ color: '#fff', fontSize: '18px', marginBottom: '6px' }}>В заведении пока нет настроенных залов</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
                Создайте первый зал (например: «Основной зал»), чтобы разместить столы
              </p>
              <button
                type="button"
                onClick={() => handleOpenZoneModal(null)}
                style={{
                  background: 'var(--accent-gold-gradient)',
                  border: 'none',
                  color: '#000',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Создать первый зал
              </button>
            </GlassCard>
          ) : (
            zones.map((zone) => {
              const zoneCapacity = (zone.tables || []).reduce((acc, t) => acc + (t.max_capacity || 0), 0);
              return (
                <GlassCard key={zone.id} style={{ padding: '24px 28px' }}>
                  {/* Заголовок зоны */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>
                          {zone.name}
                        </span>
                        <span style={{ background: 'rgba(212, 175, 55, 0.15)', color: 'var(--accent-gold)', padding: '2px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '700' }}>
                          {zone.tables?.length || 0} столов • {zoneCapacity} мест
                        </span>
                      </div>
                      {zone.description && (
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                          {zone.description}
                        </p>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenTableModal(null, zone.id)}
                        style={{
                          background: 'rgba(212, 175, 55, 0.12)',
                          border: '1px solid rgba(212, 175, 55, 0.3)',
                          color: 'var(--accent-gold)',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Plus size={14} />
                        <span>Стол в этот зал</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenZoneModal(zone)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#fff',
                          borderRadius: '8px',
                          padding: '6px 10px',
                          cursor: 'pointer'
                        }}
                        title="Редактировать зал"
                      >
                        <Edit2 size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteZone(zone.id)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.12)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#ef4444',
                          borderRadius: '8px',
                          padding: '6px 10px',
                          cursor: 'pointer'
                        }}
                        title="Удалить зал"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Сетка столов зоны */}
                  {(zone.tables || []).length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.08)' }}>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                        В этом зале пока нет столов. Нажмите «Стол в этот зал», чтобы добавить.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
                      {zone.tables.map((t) => (
                        <div
                          key={t.id}
                          style={{
                            backgroundColor: t.is_active ? 'rgba(255, 255, 255, 0.03)' : 'rgba(239, 68, 68, 0.05)',
                            border: t.is_active ? '1px solid rgba(255, 255, 255, 0.08)' : '1px dashed rgba(239, 68, 68, 0.3)',
                            borderRadius: '16px',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            position: 'relative'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '16px', fontWeight: '800', color: t.is_active ? 'var(--accent-gold)' : 'var(--text-muted)' }}>
                                №{t.table_number}
                              </span>
                              <span style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                                {t.shape === 'round' ? '⭕ Круглый' : t.shape === 'rectangle' ? '▭ Прямоуг.' : ' квадрат'}
                              </span>
                            </div>

                            <span
                              onClick={() => handleToggleTableActive(t)}
                              style={{
                                cursor: 'pointer',
                                fontSize: '10px',
                                fontWeight: '700',
                                padding: '2px 8px',
                                borderRadius: '8px',
                                backgroundColor: t.is_active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                color: t.is_active ? '#10b981' : '#ef4444'
                              }}
                              title="Нажмите, чтобы включить/выключить стол"
                            >
                              {t.is_active ? 'Активен' : 'Отключен'}
                            </span>
                          </div>

                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Вместимость: <b style={{ color: '#fff' }}>{t.min_capacity} — {t.max_capacity} персон</b>
                          </div>

                          <div style={{ display: 'flex', gap: '6px', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '8px' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenTableModal({ ...t, zone_id: zone.id })}
                              style={{
                                flex: 1,
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#fff',
                                borderRadius: '6px',
                                padding: '5px',
                                fontSize: '11px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                              }}
                            >
                              <Edit2 size={11} />
                              <span>Изменить</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteTable(t.id)}
                              style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                color: '#ef4444',
                                borderRadius: '6px',
                                padding: '5px 8px',
                                cursor: 'pointer'
                              }}
                              title="Удалить стол"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </GlassCard>
              );
            })
          )}
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО: СОЗДАНИЕ / РЕДАКТИРОВАНИЕ ЗАЛА */}
      {isZoneModalOpen && (
        <div
          onClick={() => setIsZoneModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 150,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '460px',
              backgroundColor: '#121217',
              border: '1px solid var(--accent-gold)',
              borderRadius: '20px',
              padding: '28px',
              color: '#fff',
              boxShadow: '0 20px 60px rgba(0,0,0,0.9)'
            }}
          >
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', margin: '0 0 16px' }}>
              {editingZone ? 'Редактировать зал' : 'Добавить новый зал'}
            </h3>

            <form onSubmit={handleSaveZone} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Название зала / зоны *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Например: Панорамная терраса, VIP-зал"
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Описание атмосферы
                </label>
                <input
                  type="text"
                  placeholder="Например: живая музыка, вид на ночной город"
                  value={zoneDesc}
                  onChange={(e) => setZoneDesc(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Порядок отображения в фильтрах (0, 1, 2...)
                </label>
                <input
                  type="number"
                  value={zoneOrder}
                  onChange={(e) => setZoneOrder(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsZoneModalOpen(false)}
                  style={{
                    flex: 1,
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px',
                    color: '#fff',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    background: 'var(--accent-gold-gradient)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px',
                    color: '#000',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО: СОЗДАНИЕ / РЕДАКТИРОВАНИЕ СТОЛА */}
      {isTableModalOpen && (
        <div
          onClick={() => setIsTableModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 150,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '480px',
              backgroundColor: '#121217',
              border: '1px solid var(--accent-gold)',
              borderRadius: '20px',
              padding: '28px',
              color: '#fff',
              boxShadow: '0 20px 60px rgba(0,0,0,0.9)'
            }}
          >
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', margin: '0 0 16px' }}>
              {editingTable ? `Редактировать стол №${editingTable.table_number}` : 'Добавить стол в ресторан'}
            </h3>

            <form onSubmit={handleSaveTable} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Номер / Имя стола *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Например: 12 или VIP-1"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      color: 'var(--accent-gold)',
                      fontSize: '15px',
                      fontWeight: '700',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Зал / Зона *
                  </label>
                  <select
                    value={tableZoneId}
                    onChange={(e) => setTableZoneId(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '10px',
                      padding: '11px 12px',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  >
                    {zones.map((z) => (
                      <option key={z.id} value={z.id} style={{ background: '#121217' }}>
                        {z.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Мин. персон
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={tableMinCap}
                    onChange={(e) => setTableMinCap(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      color: '#fff',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Макс. персон
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={tableMaxCap}
                    onChange={(e) => setTableMaxCap(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      color: '#fff',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Форма стола
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { id: 'square', label: 'Квадратный' },
                    { id: 'round', label: 'Круглый' },
                    { id: 'rectangle', label: 'Прямоугольный' }
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setTableShape(s.id)}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: '10px',
                        border: tableShape === s.id ? '1px solid var(--accent-gold)' : '1px solid rgba(255,255,255,0.1)',
                        backgroundColor: tableShape === s.id ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255,255,255,0.03)',
                        color: tableShape === s.id ? 'var(--accent-gold)' : '#fff',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginTop: '4px' }}>
                  <input
                    type="checkbox"
                    checked={tableIsActive}
                    onChange={(e) => setTableIsActive(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent-gold)' }}
                  />
                  <span style={{ fontSize: '13px', color: '#fff' }}>Стол активен и доступен для онлайн-бронирования</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsTableModalOpen(false)}
                  style={{
                    flex: 1,
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px',
                    color: '#fff',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    background: 'var(--accent-gold-gradient)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px',
                    color: '#000',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Сохранить стол
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
