import React, { createContext, useContext, useMemo } from 'react';

export const DEFAULT_UI_CONFIG = {
  header: {
    show_brand_name: true,
    show_table_badge: true,
    show_change_table_btn: true,
    show_language_picker: true,
    show_categories_drawer: true,
    show_category_pills: true,
    show_dietary_chips: true,
    show_table_booking_btn: true,
  },
  dish_card: {
    show_sound_toggle: true,
    show_slide_counter: true,
    show_badges: true,
    show_price: true,
    show_short_description: true,
    show_sommelier_pairing: true,
    show_weight: true,
    show_calories: true,
    show_allergens: true,
    show_ingredients: true,
    show_serving_details: true,
    show_details_toggle: true,
    show_add_to_cart_btn: true,
  },
  service_bar: {
    show_service_bar: true,
    show_call_waiter_btn: true,
    show_request_bill_btn: true,
    show_cart_btn: true,
    show_quick_requests: true,
    show_nps_rating: true,
    show_comment_input: true,
    allow_call_sommelier: true,
    allow_call_hookah: true,
    allow_call_admin: true,
  },
  cart: {
    allow_self_ordering: true,
    show_service_charge: true,
    show_waiter_screen_btn: true,
    show_live_status_tracker: true,
    show_split_bill: true,
    show_smart_item_split: true,
    show_tip_tiers: true,
  },
  kiosk: {
    show_mini_qr: true,
    show_booking_btn: true,
    show_qr_bridge_btn: true,
    show_details_modal: true,
    allow_sound_in_modal: true,
    show_floor_plan: true,
  },
  admin_tabs: {
    show_dishes_tab: true,
    show_reservations_tab: true,
    show_service_requests_tab: true,
    show_ui_config_tab: true,
    show_categories_tab: true,
    show_settings_tab: true,
    show_theme_tab: true,
    show_preview_tab: true,
  },
  // БЛОК 1: УПРАВЛЕНИЕ КУХНЕЙ И ТАЙМИНГАМИ
  kitchen_pacing: {
    enable_courses_system: true,       // Выбор курсов подачи (Курс 1, 2, 3)
    enable_kitchen_pacing: true,       // Лимит броней на 30 минут (защита кухни)
    enable_waiter_call_cooldown: true, // Задержка 45 сек на повторный вызов официанта
    cooldown_seconds: 45,              // Длительность задержки в секундах
    max_pacing_tables_per_slot: 3,     // Максимум новых столов на один 30-мин слот
  },
  // МОДУЛЬ KDS: КУХОННЫЙ ПЛАНШЕТ И ДИСПЕТЧЕР РАЗДАЧИ
  kds: {
    enable_kds_system: false,          // По умолчанию выключено (принцип нулевого риска)
    sound_alerts_enabled: true,        // Звуковое оповещение при новом заказе
    notify_waiter_on_ready: true,      // Пуш официанту, когда блюдо готово
    alert_critical_delay_minutes: 18,  // Минут до красного тревожного мигания
  }
};

const UIConfigContext = createContext(DEFAULT_UI_CONFIG);

export const UIConfigProvider = ({ customConfig, children }) => {
  const mergedConfig = useMemo(() => {
    if (!customConfig) return DEFAULT_UI_CONFIG;
    
    // Deep merge with default config for complete fallback safety
    const result = { ...DEFAULT_UI_CONFIG };
    Object.keys(DEFAULT_UI_CONFIG).forEach((section) => {
      result[section] = {
        ...DEFAULT_UI_CONFIG[section],
        ...(customConfig[section] || {})
      };
    });
    return result;
  }, [customConfig]);

  return (
    <UIConfigContext.Provider value={mergedConfig}>
      {children}
    </UIConfigContext.Provider>
  );
};

export const useUI = () => useContext(UIConfigContext);
