import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MobileHeader } from './MobileHeader';
import { DishSlide } from './DishSlide';
import { SmartServiceBar } from './SmartServiceBar';
import { ModifierModal } from './ModifierModal';
import { CartDrawer } from './CartDrawer';
import { BookingModal } from '../kiosk/BookingModal';
import { useLanguage } from '../../context/LanguageContext';
import { useUI } from '../../context/UIConfigContext';
import { useModules, MODULES } from '../../context/ModuleContext';
import { useVideoPreload } from '../../hooks/useVideoPreload';
import { WifiOff } from 'lucide-react';

export const MobileFeed = ({ restaurantData }) => {
  const { hasModule } = useModules();
  const canOrder = hasModule(MODULES.ORDERING);
  const canDispatch = hasModule(MODULES.SERVICE_DISPATCH);
  const canBook = hasModule(MODULES.RESERVATIONS);

  const ui = useUI();
  const card = ui?.dish_card || {};
  const restaurantSlug = restaurantData?.restaurant?.slug || 'asr-royale';
  const categories = restaurantData?.categories || [];
  const [activeCategoryId, setActiveCategoryId] = useState(() => categories[0]?.id || 1);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isGlobalSoundOn, setIsGlobalSoundOn] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const containerRef = useRef(null);
  const { t } = useLanguage();

  const toggleGlobalSound = () => {
    setIsGlobalSoundOn((prev) => !prev);
  };

  const tableStorageKey = `guest_table_${restaurantSlug}`;
  const tableSignStorageKey = `guest_table_sign_${restaurantSlug}`;
  const guestSessionKey = `guest_session_${restaurantSlug}`;

  // Unique guest session UUID per browsing tab
  const [guestSessionId] = useState(() => {
    if (typeof window !== 'undefined') {
      let sid = sessionStorage.getItem(guestSessionKey);
      if (!sid) {
        sid = 'gs_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
        sessionStorage.setItem(guestSessionKey, sid);
      }
      return sid;
    }
    return 'gs_default';
  });

  // Parse table parameter from URL (?table=12) with persistence in sessionStorage per tenant
  const [tableNumber, setTableNumber] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlTable = params.get('table');
      if (urlTable) {
        sessionStorage.setItem(tableStorageKey, urlTable);
        return urlTable;
      }
      return sessionStorage.getItem(tableStorageKey) || restaurantData.restaurant?.table_number || '';
    }
    return '';
  });

  // Parse cryptographic table signature from QR URL (?sign=... or ?token=...)
  const [tableSignature, setTableSignature] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlSign = params.get('sign') || params.get('token');
      if (urlSign) {
        sessionStorage.setItem(tableSignStorageKey, urlSign);
        return urlSign;
      }
      return sessionStorage.getItem(tableSignStorageKey) || restaurantData.restaurant?.table_signature || '';
    }
    return '';
  });

  // Guest Cart State with persistence in localStorage
  const [cartItems, setCartItems] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('guest_cart_' + (restaurantData.restaurant?.slug || 'menu'));
        return saved ? JSON.parse(saved) : [];
      } catch (_) {}
    }
    return [];
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [modifierDish, setModifierDish] = useState(null);
  const [isDetailExpanded, setIsDetailExpanded] = useState(false);
  const [badgeFilter, setBadgeFilter] = useState('ALL'); // 'ALL' | 'Хит' | 'Шеф' | 'Острое'
  const isProgrammaticScrollRef = useRef(false);

  // Sync cart to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          'guest_cart_' + (restaurantData.restaurant?.slug || 'menu'),
          JSON.stringify(cartItems)
        );
      } catch (_) {}
    }
  }, [cartItems, restaurantData.restaurant?.slug]);

  // Active category & dishes (filtered by preference if selected)
  const activeCategory = categories.find((c) => c.id === activeCategoryId) || categories[0];
  const allDishes = activeCategory ? activeCategory.dishes : [];
  const dishes = badgeFilter === 'ALL'
    ? allDishes
    : allDishes.filter((d) => (d.badges || []).some((b) => b.toLowerCase().includes(badgeFilter.toLowerCase())));

  // Preload next video in feed
  const nextVideo = dishes[currentSlideIndex + 1]?.media?.video_mobile;
  useVideoPreload([nextVideo]);

  // Accurate active slide calculation via container clientHeight (fixes iOS Safari floating URL bar bug)
  const handleScroll = useCallback(() => {
    if (!containerRef.current || isProgrammaticScrollRef.current) return;
    const container = containerRef.current;
    const height = container.clientHeight;
    if (height === 0) return;

    const index = Math.round(container.scrollTop / height);
    if (index !== currentSlideIndex && index >= 0 && index < dishes.length) {
      setCurrentSlideIndex(index);
    }
  }, [currentSlideIndex, dishes.length]);

  const handleSelectCategory = (catId) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(12); } catch (_) {}
    }
    isProgrammaticScrollRef.current = true;
    setActiveCategoryId(catId);
    setCurrentSlideIndex(0);
    // Preserve global dietary/lifestyle preferences (Halal, Vegan, etc.) across categories
    const GLOBAL_DIETARY_KEYWORDS = ['халяль', 'halal', 'веган', 'vegan', 'постное', 'вегетариан', 'без глютена', 'gluten'];
    const isGlobalDietary = badgeFilter !== 'ALL' && GLOBAL_DIETARY_KEYWORDS.some((kw) => badgeFilter.toLowerCase().includes(kw));
    if (!isGlobalDietary) {
      setBadgeFilter('ALL');
    }
    setIsDetailExpanded(false);
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }
    setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 150);
  };

  const handleSelectBadgeFilter = (badgeId) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(10); } catch (_) {}
    }
    isProgrammaticScrollRef.current = true;
    setBadgeFilter(badgeId);
    setCurrentSlideIndex(0);
    setIsDetailExpanded(false);
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }
    setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 150);
  };

  // Add to cart handler: if dish has modifiers, open modal; otherwise add directly
  const handleInitiateAddToCart = (dish) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(16); } catch (_) {}
    }
    if (dish.modifiers && dish.modifiers.length > 0) {
      setModifierDish(dish);
    } else {
      setCartItems((prev) => {
        const existingIdx = prev.findIndex((item) => item.dish.id === dish.id && (!item.chosenOptions || item.chosenOptions.length === 0));
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx].quantity = (updated[existingIdx].quantity || 1) + 1;
          return updated;
        }
        return [
          ...prev,
          {
            dish,
            totalPrice: Number(dish.price),
            quantity: 1,
            chosenOptions: [],
            comment: ''
          }
        ];
      });
    }
  };

  const handleAddConfiguredItem = (configuredItem) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(20); } catch (_) {}
    }
    const getSig = (item) => {
      const opts = (item.chosenOptions || [])
        .map((o) => `${o.modifierId || o.modifierName || o.group}:${o.optionName || o.name}`)
        .sort()
        .join('|');
      return `${item.dish?.id}_${opts}_${item.comment || ''}`;
    };

    const targetSig = getSig(configuredItem);
    setCartItems((prev) => {
      const matchIdx = prev.findIndex((item) => getSig(item) === targetSig);
      if (matchIdx >= 0) {
        const updated = [...prev];
        updated[matchIdx].quantity = (updated[matchIdx].quantity || 1) + 1;
        return updated;
      }
      return [...prev, { ...configuredItem, quantity: 1 }];
    });
  };

  const handleUpdateQty = (idx, delta) => {
    setCartItems((prev) => {
      const updated = [...prev];
      const newQty = (updated[idx].quantity || 1) + delta;
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== idx);
      }
      updated[idx].quantity = newQty;
      return updated;
    });
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const handleUpdateItemCourse = useCallback((itemIndex, newCourse) => {
    setCartItems((prevItems) => {
      return prevItems.map((item, idx) => {
        if (idx === itemIndex) {
          return { ...item, course: newCourse };
        }
        return item;
      });
    });
  }, []);

  const handleAddPairingToCart = (pairing, parentDish) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(16); } catch (_) {}
    }
    let title = pairing.name || pairing.text || 'Винная рекомендация';
    let price = Number(pairing.price) || 0;
    if (!price && typeof pairing.text === 'string') {
      const match = pairing.text.match(/\((\d+)\s*([A-Za-zА-Яа-я]+)?\)/);
      if (match) {
        price = parseInt(match[1], 10);
      }
    }
    // Динамический расчет цены по умолчанию: 35% от стоимости родительского блюда (без хардкода 120)
    if (!price) {
      const parentPrice = Number(parentDish?.price) || 0;
      price = parentPrice > 0 ? Math.round(parentPrice * 0.35) : 100;
    }
    title = title.replace(/^(Идеально сочетается с:\s*|Рекомендация:\s*)/i, '');

    const activeCurrency = parentDish?.currency || restaurantData?.restaurant?.currency || 'TJS';

    const pairingDish = {
      id: `pairing_${parentDish?.id || 'upsell'}_${Date.now()}`,
      name: { ru: title, en: title, tj: title },
      price: price,
      currency: activeCurrency,
      media: {}
    };

    setCartItems((prev) => [
      ...prev,
      {
        dish: pairingDish,
        totalPrice: price,
        quantity: 1,
        chosenOptions: [{ modifierName: 'Рекомендация сомелье к', optionName: t(parentDish?.name || 'блюду') }],
        comment: ''
      }
    ]);
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100dvh',
        overflow: 'hidden',
        backgroundColor: '#09090b'
      }}
    >
      {/* Offline Banner if served from cache */}
      {restaurantData._isOffline && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 60,
            backgroundColor: '#ef4444',
            color: '#fff',
            fontSize: '11px',
            fontWeight: '700',
            textAlign: 'center',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <WifiOff size={13} />
          <span>Офлайн-режим: отображается сохранённая версия меню</span>
        </div>
      )}

      {/* Unified Luxury Mobile Header */}
      <MobileHeader
        restaurantName={restaurantData.restaurant?.name || 'ASR Maison Royale'}
        categories={categories}
        activeCategoryId={activeCategoryId}
        onSelectCategory={handleSelectCategory}
        badgeFilter={badgeFilter}
        onSelectBadgeFilter={handleSelectBadgeFilter}
        tableNumber={tableNumber}
        onOpenBooking={(canBook && ui?.header?.show_table_booking_btn !== false) ? () => setIsBookingOpen(true) : null}
        onChangeTable={() => {
          if (tableSignature) {
            alert('Номер стола верифицирован по оригинальному QR-коду и зафиксирован для защиты от ошибок.');
            return;
          }
          const newTbl = window.prompt('Укажите номер вашего стола (например: 12 или VIP-1):', tableNumber || '');
          if (newTbl && newTbl.trim()) {
            const trimmed = newTbl.trim();
            setTableNumber(trimmed);
            setTableSignature('');
            sessionStorage.setItem(tableStorageKey, trimmed);
            sessionStorage.removeItem(tableSignStorageKey);
          }
        }}
      />

      {/* Vertical Reels Container */}
      {dishes.length > 0 ? (
        <div
          ref={containerRef}
          className="reels-container"
          onScroll={handleScroll}
        >
          {dishes.map((dish, idx) => {
            const shouldMountMedia = Math.abs(idx - currentSlideIndex) <= 1;
            return (
              <section key={dish.id} className="reel-slide">
                <DishSlide
                  dish={dish}
                  isCurrent={idx === currentSlideIndex}
                  shouldMountMedia={shouldMountMedia}
                  isSoundEnabled={isGlobalSoundOn}
                  onToggleSound={toggleGlobalSound}
                  categoryName={t(activeCategory.name)}
                  onAddToCart={(canOrder && card.show_add_to_cart_btn !== false) ? handleInitiateAddToCart : null}
                  onAddPairingToCart={(canOrder && card.show_add_to_cart_btn !== false) ? handleAddPairingToCart : null}
                  onDetailsToggle={setIsDetailExpanded}
                />
              </section>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            padding: '24px',
            textAlign: 'center'
          }}
        >
          <p style={{ fontSize: '18px', color: 'var(--text-main)', marginBottom: '8px' }}>
            В этой категории пока нет блюд
          </p>
          <p style={{ fontSize: '14px' }}>
            Пожалуйста, выберите другой раздел в верхнем меню
          </p>
        </div>
      )}

      {/* Slide counter pill & dots indicator on the right */}
      {card.show_slide_counter !== false && dishes.length > 1 && (
        <div
          style={{
            position: 'fixed',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 35,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            pointerEvents: 'none'
          }}
        >
          <div
            style={{
              fontSize: '10px',
              fontWeight: '700',
              color: 'var(--accent-gold)',
              backgroundColor: 'rgba(9, 9, 11, 0.75)',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              borderRadius: '8px',
              padding: '2px 5px',
              marginBottom: '4px',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)'
            }}
          >
            {currentSlideIndex + 1}/{dishes.length}
          </div>

          {dishes.map((_, idx) => (
            <div
              key={idx}
              style={{
                width: '4px',
                height: idx === currentSlideIndex ? '20px' : '4px',
                borderRadius: '4px',
                backgroundColor:
                  idx === currentSlideIndex
                    ? 'var(--accent-gold)'
                    : 'rgba(255, 255, 255, 0.3)',
                boxShadow:
                  idx === currentSlideIndex
                    ? '0 0 8px rgba(212, 175, 55, 0.6)'
                    : 'none',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>
      )}

      {/* Smart Table Service Bar (Waiter, Bill, Cart) */}
      {(canDispatch || canOrder) && (
        <SmartServiceBar
          restaurantSlug={restaurantSlug}
          tableNumber={tableNumber}
          tableSignature={tableSignature}
          guestSessionId={guestSessionId}
          canDispatch={canDispatch}
          canOrder={canOrder}
          cartCount={canOrder ? cartItems.reduce((acc, i) => acc + (i.quantity || 1), 0) : 0}
          hidden={isDetailExpanded}
          callTypesEnabled={canDispatch ? (restaurantData.restaurant?.call_types_enabled || ['waiter', 'bill', 'sommelier', 'hookah', 'admin']) : []}
          availableTables={restaurantData.restaurant?.available_tables || []}
          onOpenCart={canOrder ? () => setIsCartOpen(true) : null}
          onSetTableNumber={(tbl) => {
            setTableNumber(tbl);
            sessionStorage.setItem(tableStorageKey, tbl);
          }}
        />
      )}

      {/* Modifiers Selection Modal */}
      {canOrder && modifierDish && (
        <ModifierModal
          dish={modifierDish}
          onClose={() => setModifierDish(null)}
          onAddToCart={handleAddConfiguredItem}
        />
      )}

      {/* Cart Drawer */}
      {canOrder && isCartOpen && (
        <CartDrawer
          cartItems={cartItems}
          tableNumber={tableNumber}
          tableSignature={tableSignature}
          guestSessionId={guestSessionId}
          restaurantSlug={restaurantSlug}
          currency={restaurantData.restaurant?.currency || 'TJS'}
          serviceChargePercent={restaurantData.restaurant?.service_charge_percent ?? 10}
          onClose={() => setIsCartOpen(false)}
          onUpdateQty={handleUpdateQty}
          onUpdateItemCourse={handleUpdateItemCourse}
          onClearCart={handleClearCart}
          onSetTableNumber={(tbl) => {
            setTableNumber(tbl);
            sessionStorage.setItem(tableStorageKey, tbl);
          }}
        />
      )}

      {/* Online Table Booking Modal */}
      {canBook && isBookingOpen && (
        <BookingModal
          restaurantSlug={restaurantSlug}
          restaurantName={restaurantData.restaurant?.name || 'ASR Maison Royale'}
          currency={restaurantData.restaurant?.currency || 'TJS'}
          onClose={() => setIsBookingOpen(false)}
        />
      )}
    </div>
  );
};
