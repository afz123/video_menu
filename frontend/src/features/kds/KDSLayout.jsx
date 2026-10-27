import React, { useState, useEffect, useRef, useMemo } from 'react';
import { menuService } from '../../services/menuService';
import { useUI } from '../../context/UIConfigContext';
import { 
  Flame, Utensils, CheckCircle2, Clock, AlertTriangle, 
  Volume2, VolumeX, ArrowRight, RefreshCw, ChefHat, BellRing,
  ArrowLeft, Check, ShieldAlert, Sparkles, Layers
} from 'lucide-react';

export const KDSLayout = ({ restaurantSlug = 'asr-royale' }) => {
  const ui = useUI();
  const kdsUI = ui?.kds || {};
  const [orders, setOrders] = useState([]);
  const [activeDepartment, setActiveDepartment] = useState('ALL'); // 'ALL' | 'HOT' | 'COLD' | 'BAR'
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [kdsEnabled, setKdsEnabled] = useState(true);
  const [restaurantName, setRestaurantName] = useState('');
  const [completedOrders, setCompletedOrders] = useState([]);
  const [showArchive, setShowArchive] = useState(false);
  const [alertCriticalMinutes, setAlertCriticalMinutes] = useState(
    kdsUI.alert_critical_delay_minutes || 18
  );

  const audioContextRef = useRef(null);
  const prevOrderCountRef = useRef(0);

  // Play a soft high-end dining chime when a new ticket arrives
  const playAlertSound = () => {
    if (!isSoundOn) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const now = ctx.currentTime;

      // Note 1: D5 (587.33 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.5);

      // Note 2: A5 (880.00 Hz) chime
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.0, now + 0.12);
      gain2.gain.setValueAtTime(0.35, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.8);
    } catch (_) {}
  };

  const fetchOrders = async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      // Primary: specialized KDS endpoint
      try {
        const kdsRes = await menuService.getKDSOrders(restaurantSlug);
        if (kdsRes) {
          if (kdsRes.kds_enabled === false) {
            setKdsEnabled(false);
            return;
          }
          setKdsEnabled(true);
          if (kdsRes.restaurant_name) setRestaurantName(kdsRes.restaurant_name);
          if (kdsRes.kds_config?.alert_critical_delay_minutes) {
            setAlertCriticalMinutes(kdsRes.kds_config.alert_critical_delay_minutes);
          }

          const freshOrders = kdsRes.orders || [];
          if (freshOrders.length > prevOrderCountRef.current && prevOrderCountRef.current > 0) {
            playAlertSound();
          }
          prevOrderCountRef.current = freshOrders.length;
          setOrders(freshOrders);
          return;
        }
      } catch (kdsErr) {
        console.warn('Dedicated KDS endpoint fallback to service-requests:', kdsErr);
      }

      // Fallback: general service requests (if admin logged in or open mode)
      const data = await menuService.getServiceRequests(restaurantSlug, 'PENDING');
      const orderRequests = (data || []).filter(
        (r) => (r.request_type === 'order' || r.request_type === 'repeat_order') && r.cart_items?.length > 0
      );

      if (orderRequests.length > prevOrderCountRef.current && prevOrderCountRef.current > 0) {
        playAlertSound();
      }
      prevOrderCountRef.current = orderRequests.length;
      setOrders(orderRequests);
    } catch (err) {
      console.error('KDS polling error:', err);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => {
      fetchOrders(true);
    }, 4500); // Poll every 4.5 seconds
    return () => clearInterval(interval);
  }, [restaurantSlug]);

  // Elapsed minutes since order creation
  const getElapsedMinutes = (createdAt) => {
    if (!createdAt) return 0;
    const diffMs = Date.now() - new Date(createdAt).getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
  };

  // Helper to determine department of an item
  const getItemDepartment = (item) => {
    const name = (item.name || '').toLowerCase();
    const course = (item.course || '').toLowerCase();

    if (name.includes('вино') || name.includes('сок') || name.includes('чай') || name.includes('кофе') || name.includes('коктейль') || name.includes('вода') || name.includes('напиток')) {
      return 'BAR';
    }
    if (course.includes('закуск') || name.includes('салат') || name.includes('тартар') || name.includes('карпаччо') || name.includes('брускет') || name.includes('холод')) {
      return 'COLD';
    }
    return 'HOT'; // Default hot kitchen
  };

  // Toggle item ready state
  const handleToggleItemReady = async (orderId, itemIndex) => {
    try {
      const order = orders.find((o) => o.id === orderId);
      if (!order || !order.cart_items) return;
      const currentStatus = order.cart_items[itemIndex]?.status;
      const newStatus = currentStatus === 'READY' ? 'COOKING' : 'READY';

      // Optimistic UI update
      setOrders((prev) =>
        prev.map((ord) => {
          if (ord.id !== orderId) return ord;
          const updatedItems = [...ord.cart_items];
          updatedItems[itemIndex] = {
            ...updatedItems[itemIndex],
            status: newStatus
          };
          return { ...ord, cart_items: updatedItems };
        })
      );

      // Server update
      await menuService.updateKDSItemStatus(restaurantSlug, orderId, itemIndex, newStatus);
    } catch (err) {
      console.error('Failed to update item status:', err);
    }
  };

  // Complete entire ticket & alert waiters
  const handleCompleteOrder = async (orderId) => {
    try {
      const completed = orders.find((o) => o.id === orderId);
      if (completed) {
        setCompletedOrders((prev) => [
          { ...completed, completed_at: new Date().toISOString() },
          ...prev.slice(0, 19)
        ]);
      }

      // Optimistic remove
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      prevOrderCountRef.current = Math.max(0, prevOrderCountRef.current - 1);

      // Call API
      try {
        await menuService.updateKDSOrderStatus(restaurantSlug, orderId, 'COMPLETED');
      } catch (_) {
        await menuService.updateServiceRequestStatus(restaurantSlug, orderId, 'COMPLETED');
      }
    } catch (err) {
      alert('Ошибка при завершении заказа: ' + err.message);
    }
  };

  // Filter orders by active department
  const filteredOrders = useMemo(() => {
    if (activeDepartment === 'ALL') return orders;
    return orders
      .map((ord) => {
        const matchingItems = (ord.cart_items || []).filter(
          (item) => getItemDepartment(item) === activeDepartment
        );
        return {
          ...ord,
          cart_items: matchingItems,
          totalItemsInOrder: ord.cart_items?.length || 0
        };
      })
      .filter((ord) => ord.cart_items.length > 0);
  }, [orders, activeDepartment]);

  // Graceful Degradation: If KDS module is disabled in admin
  if (!kdsEnabled) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#090a0f',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '24px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#f87171',
          marginBottom: '20px'
        }}>
          <ChefHat size={44} />
        </div>
        <h2 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 10px', color: '#fff' }}>
          Модуль KDS (Кухонный экран) выключен
        </h2>
        <p style={{ color: '#94a3b8', maxWidth: '520px', lineHeight: '1.6', fontSize: '15px', margin: '0 0 28px' }}>
          Заказы гостей сейчас поступают по классическому сценарию через Telegram и чековый термопринтер.
          Чтобы включить кухонный планшет для поваров, переведите тумблер в положение <b>«ВКЛ»</b> в Конструкторе UI панели администратора.
        </p>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          <a
            href={`/menu/${restaurantSlug}`}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              padding: '12px 22px',
              color: '#fff',
              fontWeight: '600',
              textDecoration: 'none',
              fontSize: '14px'
            }}
          >
            ← В меню ресторана
          </a>
          <a
            href={`/admin`}
            style={{
              background: 'linear-gradient(135deg, #d4af37 0%, #aa820a 100%)',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 24px',
              color: '#000',
              fontWeight: '700',
              textDecoration: 'none',
              fontSize: '14px',
              boxShadow: '0 4px 18px rgba(212, 175, 55, 0.35)'
            }}
          >
            Панель управления (Админка) →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#0a0b10',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      userSelect: 'none',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* 1. KDS TOP COMMAND BAR */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 24px',
        backgroundColor: '#12141c',
        borderBottom: '2px solid #1f2330',
        zIndex: 10
      }}>
        {/* Brand / Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)',
            color: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(212, 175, 55, 0.35)'
          }}>
            <ChefHat size={26} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '18px', fontWeight: '900', margin: 0, letterSpacing: '0.04em' }}>
                KITCHEN DISPLAY SYSTEM
              </h1>
              <span style={{
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid #10b981',
                color: '#6ee7b7',
                fontSize: '10px',
                fontWeight: '800',
                padding: '2px 6px',
                borderRadius: '6px',
                textTransform: 'uppercase'
              }}>
                LIVE KDS
              </span>
            </div>
            <span style={{ fontSize: '12px', color: '#8c94a8' }}>
              {restaurantName || 'Раздача шеф-повара'} • <strong style={{ color: '#fff' }}>{orders.length}</strong> активных столов
            </span>
          </div>
        </div>

        {/* Department Filters (Цеховые экраны) */}
        <div style={{
          display: 'flex',
          gap: '6px',
          backgroundColor: '#0a0b10',
          padding: '4px',
          borderRadius: '14px',
          border: '1px solid #1f2330'
        }}>
          {[
            { id: 'ALL', label: 'Все цеха' },
            { id: 'HOT', label: '🥩 Горячий цех' },
            { id: 'COLD', label: '🥗 Холодный цех' },
            { id: 'BAR', label: '🍷 Бар' }
          ].map((tab) => {
            const isSelected = activeDepartment === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveDepartment(tab.id)}
                style={{
                  background: isSelected ? 'linear-gradient(135deg, #d4af37 0%, #aa820a 100%)' : 'transparent',
                  color: isSelected ? '#000' : '#8c94a8',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 2px 10px rgba(212, 175, 55, 0.3)' : 'none'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Controls: Sound, Archive, Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Sound alert toggle */}
          <button
            onClick={() => setIsSoundOn(!isSoundOn)}
            style={{
              background: '#1b1e2b',
              border: '1px solid #282d40',
              borderRadius: '12px',
              padding: '10px',
              color: isSoundOn ? '#d4af37' : '#6b7280',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            title={isSoundOn ? 'Звук оповещений включен' : 'Звук оповещений выключен'}
          >
            {isSoundOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>

          {/* Archive / History toggle */}
          {completedOrders.length > 0 && (
            <button
              onClick={() => setShowArchive(!showArchive)}
              style={{
                background: showArchive ? 'rgba(212, 175, 55, 0.2)' : '#1b1e2b',
                border: showArchive ? '1px solid #d4af37' : '1px solid #282d40',
                borderRadius: '12px',
                padding: '10px 14px',
                color: showArchive ? '#d4af37' : '#cbd5e1',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              История ({completedOrders.length})
            </button>
          )}

          {/* Manual reload */}
          <button
            onClick={() => fetchOrders(false)}
            style={{
              background: '#1b1e2b',
              border: '1px solid #282d40',
              borderRadius: '12px',
              padding: '10px 14px',
              color: '#fff',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={15} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
            <span>Обновить</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN TICKET FEED */}
      <main style={{
        flex: 1,
        padding: '20px',
        overflowX: 'auto',
        overflowY: 'hidden',
        display: 'flex',
        gap: '20px',
        alignItems: 'flex-start'
      }}>
        {filteredOrders.length === 0 ? (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#475569'
          }}>
            <div style={{
              width: '90px',
              height: '90px',
              borderRadius: '50%',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              border: '2px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981',
              marginBottom: '18px'
            }}>
              <CheckCircle2 size={52} />
            </div>
            <h2 style={{ fontSize: '26px', color: '#fff', margin: '0 0 8px 0', fontWeight: '800' }}>
              Все заказы отданы!
            </h2>
            <p style={{ margin: 0, fontSize: '15px', maxWidth: '440px', textAlign: 'center', lineHeight: '1.5' }}>
              Кухня свободна. Новые заказы гостей и дозаказы появятся здесь моментально со звуковым гонгом.
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const minutesElapsed = getElapsedMinutes(order.created_at);
            // SLA Color grading: Green < 10m, Amber 10-18m, Pulsing Red > 18m
            const isLate = minutesElapsed >= alertCriticalMinutes;
            const isWarning = minutesElapsed >= 10 && minutesElapsed < alertCriticalMinutes;

            const borderColor = isLate ? '#ef4444' : isWarning ? '#f59e0b' : '#3b82f6';
            const badgeBg = isLate ? 'rgba(239, 68, 68, 0.25)' : isWarning ? 'rgba(245, 158, 11, 0.25)' : 'rgba(59, 130, 246, 0.25)';
            const badgeColor = isLate ? '#f87171' : isWarning ? '#fbbf24' : '#60a5fa';

            const items = order.cart_items || [];
            const allItemsReady = items.length > 0 && items.every((i) => i.status === 'READY');

            return (
              <div
                key={order.id}
                style={{
                  width: '360px',
                  minWidth: '360px',
                  maxHeight: 'calc(100vh - 110px)',
                  backgroundColor: '#13151f',
                  border: `2px solid ${allItemsReady ? '#10b981' : borderColor}`,
                  borderRadius: '18px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: isLate 
                    ? '0 0 35px rgba(239, 68, 68, 0.45)' 
                    : allItemsReady 
                    ? '0 0 25px rgba(16, 185, 129, 0.35)' 
                    : '0 12px 36px rgba(0,0,0,0.7)',
                  animation: isLate ? 'kdsPulse 2s infinite ease-in-out' : 'none'
                }}
              >
                {/* Ticket Header */}
                <div style={{
                  padding: '14px 18px',
                  backgroundColor: '#1a1d2b',
                  borderBottom: '1px solid #262b3d',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{
                      fontSize: '11px',
                      color: order.request_type === 'repeat_order' ? '#fbbf24' : '#94a3b8',
                      textTransform: 'uppercase',
                      fontWeight: '800',
                      letterSpacing: '0.06em'
                    }}>
                      {order.request_type === 'repeat_order' ? '🔁 ДОЗАКАЗ К СТОЛУ' : 'НОВЫЙ ЗАКАЗ'}
                    </span>
                    <h2 style={{ fontSize: '26px', fontWeight: '900', margin: '2px 0 0', color: '#fff' }}>
                      СТОЛ № {order.table_number}
                    </h2>
                  </div>

                  {/* SLA Elapsed Timer Badge */}
                  <div style={{
                    backgroundColor: badgeBg,
                    border: `1px solid ${borderColor}`,
                    color: badgeColor,
                    padding: '6px 12px',
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontWeight: '900',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <Clock size={16} />
                    <span>{minutesElapsed} мин</span>
                  </div>
                </div>

                {/* Items List (Scrollable) */}
                <div style={{
                  padding: '14px 16px',
                  flex: 1,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  {items.map((item, idx) => {
                    const isReady = item.status === 'READY';

                    return (
                      <div
                        key={idx}
                        onClick={() => handleToggleItemReady(order.id, idx)}
                        style={{
                          backgroundColor: isReady ? 'rgba(16, 185, 129, 0.12)' : '#1a1d2c',
                          border: isReady ? '1px solid #10b981' : '1px solid #272d42',
                          borderRadius: '12px',
                          padding: '12px 14px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '12px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              backgroundColor: '#d4af37',
                              color: '#000',
                              fontWeight: '900',
                              fontSize: '13px',
                              padding: '2px 8px',
                              borderRadius: '6px'
                            }}>
                              x{item.quantity || 1}
                            </span>
                            <span style={{
                              fontSize: '16px',
                              fontWeight: '800',
                              color: isReady ? '#86efac' : '#fff',
                              textDecoration: isReady ? 'line-through' : 'none'
                            }}>
                              {item.name}
                            </span>
                          </div>

                          {/* Course badge (Курс 1, 2, 3) */}
                          {item.course && (
                            <div style={{
                              display: 'inline-block',
                              marginTop: '4px',
                              fontSize: '11px',
                              fontWeight: '700',
                              color: '#d4af37',
                              backgroundColor: 'rgba(212, 175, 55, 0.15)',
                              padding: '2px 8px',
                              borderRadius: '4px'
                            }}>
                              ⏱️ {item.course}
                            </div>
                          )}

                          {/* Modifiers & Cooking notes */}
                          {item.chosen_options?.length > 0 && (
                            <div style={{ fontSize: '13px', color: '#fbbf24', marginTop: '4px', fontWeight: '600' }}>
                              {item.chosen_options.map((o) => (typeof o === 'string' ? o : o.name)).join(' • ')}
                            </div>
                          )}

                          {/* Guest instructions */}
                          {item.comment && (
                            <div style={{ fontSize: '12px', color: '#cbd5e1', fontStyle: 'italic', marginTop: '3px' }}>
                              «{item.comment}»
                            </div>
                          )}
                        </div>

                        {/* Status Check Circle */}
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: isReady ? '#10b981' : 'rgba(255,255,255,0.06)',
                          color: isReady ? '#000' : 'transparent',
                          border: isReady ? 'none' : '1px solid rgba(255,255,255,0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Check size={20} strokeWidth={3} />
                        </div>
                      </div>
                    );
                  })}

                  {/* General Order Comment */}
                  {order.guest_comment && (
                    <div style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      color: '#cbd5e1',
                      borderLeft: '3px solid #d4af37'
                    }}>
                      💬 <b>Примечание к чеку:</b> {order.guest_comment}
                    </div>
                  )}
                </div>

                {/* Ticket Action Button (Отдать заказ / Уведомить официанта) */}
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#1a1d2b',
                  borderTop: '1px solid #262b3d'
                }}>
                  <button
                    onClick={() => handleCompleteOrder(order.id)}
                    style={{
                      width: '100%',
                      background: allItemsReady
                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '14px',
                      color: '#fff',
                      fontSize: '15px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: allItemsReady 
                        ? '0 4px 18px rgba(16, 185, 129, 0.45)' 
                        : '0 4px 14px rgba(59, 130, 246, 0.35)'
                    }}
                  >
                    <BellRing size={19} />
                    <span>
                      {allItemsReady ? 'ГОТОВО К ОТДАЧЕ (ВЫЗОВ)' : 'ОТДАТЬ СТОЛ ЦЕЛИКОМ'}
                    </span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* Archive Slide-Out Panel */}
      {showArchive && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '380px',
          backgroundColor: '#12141c',
          borderLeft: '2px solid #232738',
          zIndex: 50,
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-10px 0 30px rgba(0,0,0,0.8)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>История отданных столов</h3>
            <button
              onClick={() => setShowArchive(false)}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                padding: '6px 12px',
                cursor: 'pointer'
              }}
            >
              Закрыть
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {completedOrders.map((ord, idx) => (
              <div key={idx} style={{
                backgroundColor: '#1a1d2c',
                border: '1px solid #272d42',
                borderRadius: '10px',
                padding: '12px',
                fontSize: '13px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700' }}>
                  <span>Стол №{ord.table_number}</span>
                  <span style={{ color: '#10b981' }}>Отдано ✓</span>
                </div>
                <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '4px' }}>
                  {ord.cart_items?.map((i) => `${i.name} (x${i.quantity || 1})`).join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CSS Animation Keyframes */}
      <style>{`
        @keyframes kdsPulse {
          0%, 100% {
            box-shadow: 0 0 25px rgba(239, 68, 68, 0.35);
          }
          50% {
            box-shadow: 0 0 45px rgba(239, 68, 68, 0.7);
          }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
