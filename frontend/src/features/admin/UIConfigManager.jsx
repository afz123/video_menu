import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GoldButton } from '../../components/ui/GoldButton';
import { menuService } from '../../services/menuService';
import { DEFAULT_UI_CONFIG } from '../../context/UIConfigContext';
import {
  Sliders,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  Smartphone,
  Tv,
  ShoppingBag,
  Bell,
  Utensils
} from 'lucide-react';

export const UIConfigManager = ({ restaurantSlug, initialConfig, onSaved }) => {
  const [config, setConfig] = useState(() => {
    const base = { ...DEFAULT_UI_CONFIG };
    if (!initialConfig) return base;
    Object.keys(DEFAULT_UI_CONFIG).forEach((sec) => {
      base[sec] = {
        ...DEFAULT_UI_CONFIG[sec],
        ...(initialConfig[sec] || {})
      };
    });
    return base;
  });

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (initialConfig) {
      const base = { ...DEFAULT_UI_CONFIG };
      Object.keys(DEFAULT_UI_CONFIG).forEach((sec) => {
        base[sec] = {
          ...DEFAULT_UI_CONFIG[sec],
          ...(initialConfig[sec] || {})
        };
      });
      setConfig(base);
    }
  }, [initialConfig]);

  const toggle = (section, key) => {
    setConfig((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] || {}),
        [key]: prev[section]?.[key] === false ? true : false
      }
    }));
  };

  const setAllInSection = (section, value) => {
    setConfig((prev) => {
      const updatedSection = {};
      const template = DEFAULT_UI_CONFIG[section] || {};
      Object.keys(template).forEach((k) => {
        updatedSection[k] = value;
      });
      return { ...prev, [section]: updatedSection };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      try {
        await menuService.updateUIConfig(restaurantSlug, config);
      } catch (_) {
        // Fallback to updateRestaurant if ui-config endpoint isn't reached
        await menuService.updateRestaurant(restaurantSlug, {
          ui_config: config
        });
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      if (onSaved) onSaved(config);
    } catch (err) {
      alert('Ошибка при сохранении конфигурации: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Sections and descriptions for the visual configurator
  const SECTIONS = [
    {
      id: 'dish_card',
      title: 'Карточка блюда & Видео (Reels)',
      icon: Utensils,
      color: 'var(--accent-gold)',
      items: [
        { key: 'show_sound_toggle', label: 'Кнопка звука ASMR (динамик)', desc: 'Позволяет гостю включать звук шипения/готовки блюда' },
        { key: 'show_price', label: 'Стоимость блюда и валюта', desc: 'Отображение цены позиции' },
        { key: 'show_add_to_cart_btn', label: 'Кнопка «В заказ / Настроить»', desc: 'Если выключить — меню превращается в презентационный каталог без заказа' },
        { key: 'show_badges', label: 'Маркетинговые бейджи', desc: 'Плашки «Хит», «Выбор Шефа», «NEW», «Острое» поверх видео' },
        { key: 'show_short_description', label: 'Краткое описание', desc: 'Текст описания под названием блюда' },
        { key: 'show_sommelier_pairing', label: 'Блок винного пейринга', desc: 'Рекомендация бокала вина / напитка к блюду (+18% к чеку)' },
        { key: 'show_weight', label: 'Выход блюда / Граммовка', desc: 'Вес порции (например: 350 г или 400 мл)' },
        { key: 'show_calories', label: 'Калории (Ккал / БЖУ)', desc: 'Энергетическая ценность блюда' },
        { key: 'show_allergens', label: 'Предупреждение об аллергенах', desc: 'Орехи, лактоза, глютен и др.' },
        { key: 'show_ingredients', label: 'Полный состав и ингредиенты', desc: 'Подробный список компонентов в карточке' },
        { key: 'show_serving_details', label: 'Особенности подачи от шефа', desc: 'Температура, гарнировка, соусы' },
        { key: 'show_details_toggle', label: 'Кнопка «Подробнее / Скрыть»', desc: 'Разворачивание полного состава по тапу' },
        { key: 'show_slide_counter', label: 'Счетчик слайдов (1/12)', desc: 'Индикатор номера текущего блюда в категории' },
      ]
    },
    {
      id: 'header',
      title: 'Шапка мобильного меню',
      icon: Smartphone,
      color: '#38bdf8',
      items: [
        { key: 'show_brand_name', label: 'Название ресторана', desc: 'Отображение логотипа/бренда сверху' },
        { key: 'show_table_badge', label: 'Бейдж стола «📍 Стол №...»', desc: 'Индикатор стола, за которым сидит гость' },
        { key: 'show_change_table_btn', label: 'Возможность сменить стол', desc: 'Разрешить гостю менять номер стола вручную' },
        { key: 'show_language_picker', label: 'Переключатель языка (RU/EN/TJ)', desc: 'Выбор языка меню гостем' },
        { key: 'show_categories_drawer', label: 'Кнопка меню «Разделы»', desc: 'Боковое/нижнее меню выбора категории' },
        { key: 'show_category_pills', label: 'Горизонтальные табы категорий', desc: 'Кнопки быстрого переключения разделов' },
        { key: 'show_dietary_chips', label: 'Быстрые фильтры («Хиты», «Острое»)', desc: 'Чипсы для моментальной фильтрации' },
        { key: 'show_table_booking_btn', label: 'Кнопка бронирования в меню («Разделы»)', desc: 'Позволяет гостям бронировать стол онлайн прямо из каталога' },
      ]
    },
    {
      id: 'service_bar',
      title: 'Нижняя сервисная планка (Вызовы & Счёт)',
      icon: Bell,
      color: '#eab308',
      items: [
        { key: 'show_service_bar', label: 'Вся нижняя планка целиком', desc: 'Главный рубильник сервисной панели' },
        { key: 'show_call_waiter_btn', label: 'Кнопка «Позвать официанта»', desc: 'Вызов официанта к номеру стола' },
        { key: 'show_request_bill_btn', label: 'Кнопка «Счёт»', desc: 'Запрос расчета (карта / наличные)' },
        { key: 'show_cart_btn', label: 'Кнопка «Заказ (Корзина)»', desc: 'Отображение кнопки корзины с количеством' },
        { key: 'show_quick_requests', label: 'Быстрые просьбы (Лёд, Приборы...)', desc: 'Готовые чипсы частых просьб' },
        { key: 'show_nps_rating', label: 'Оценка визита 1-5 звезд', desc: 'NPS-оценка перед запросом счёта' },
        { key: 'show_comment_input', label: 'Поле ввода пожелания к вызову', desc: 'Текстовый комментарий официанту' },
        { key: 'allow_call_sommelier', label: 'Вызов сомелье (🍷)', desc: 'Разрешить гостям звать винного консультанта' },
        { key: 'allow_call_hookah', label: 'Вызов кальянного мастера (💨)', desc: 'Разрешить гостям звать кальянщика' },
        { key: 'allow_call_admin', label: 'Вызов управляющего (👔)', desc: 'Разрешить гостям звать администратора зала' },
      ]
    },
    {
      id: 'cart',
      title: 'Корзина и Оформление заказа',
      icon: ShoppingBag,
      color: '#10b981',
      items: [
        { key: 'allow_self_ordering', label: 'Кнопка «Отправить заказ на кухню»', desc: 'Прямая отправка чека персоналу' },
        { key: 'show_waiter_screen_btn', label: 'Кнопка «Показать официанту»', desc: 'Полноэкранный режим показа экрана при личном заказе' },
        { key: 'show_service_charge', label: 'Строка «Обслуживание (10%)»', desc: 'Отображение сервисного сбора в чеке' },
        { key: 'show_live_status_tracker', label: 'Живой трекер статуса заказа', desc: 'Индикатор: Принят -> Передан на кухню' },
        { key: 'show_split_bill', label: 'Калькулятор разделения счета (Split-Bill)', desc: 'Разделение суммы между гостями на 1–6 персон' },
        { key: 'show_tip_tiers', label: 'Шкала чаевых официанту (10%, 15%, 20%)', desc: 'Быстрые кнопки чаевых команде зала' },
      ]
    },
    {
      id: 'kiosk',
      title: 'Уличный сенсорный экран (Kiosk Mode)',
      icon: Tv,
      color: '#a855f7',
      items: [
        { key: 'show_mini_qr', label: 'Мини QR-код на заставке', desc: 'QR-код в углу рекламного видео для прохожих' },
        { key: 'show_booking_btn', label: 'Кнопка «Забронировать стол»', desc: 'Сбор заявок на бронирование с улицы' },
        { key: 'show_qr_bridge_btn', label: 'Кнопка «Забрать меню на телефон»', desc: 'Большой QR-код передачи каталога на смартфон' },
        { key: 'show_details_modal', label: 'Полноэкранная карточка блюда', desc: 'Открытие видео и состава при тапе на блюдо' },
        { key: 'allow_sound_in_modal', label: 'Звук в карточке киоска', desc: 'Разрешить включение звука на уличном экране' },
        { key: 'show_floor_plan', label: 'Интерактивная карта залов и столов (Floor Plan)', desc: 'Визуальный выбор стола на 2D-схеме ресторана' },
      ]
    },
    {
      id: 'admin_tabs',
      title: 'Вкладки панели управления (Admin Panel)',
      icon: Sliders,
      color: '#ec4899',
      items: [
        { key: 'show_dishes_tab', label: 'Вкладка «Позиции меню & Стоп-лист»', desc: 'Управление блюдами, ценами и стоп-листом' },
        { key: 'show_reservations_tab', label: 'Вкладка «Бронирование столов»', desc: 'Журнал броней, шахматка и рассадка' },
        { key: 'show_service_requests_tab', label: 'Вкладка «Вызовы & Заказы»', desc: 'Монитор запросов гостей в реальном времени' },
        { key: 'show_ui_config_tab', label: 'Вкладка «Конструктор UI»', desc: 'Рубильники и флаги интерфейса' },
        { key: 'show_categories_tab', label: 'Вкладка «Управление разделами»', desc: 'Категории кухни и бара' },
        { key: 'show_settings_tab', label: 'Вкладка «Настройки заведения»', desc: 'Реквизиты, контакты, Telegram и пароли' },
        { key: 'show_theme_tab', label: 'Вкладка «Стиль & Kiosk Display»', desc: 'Цветовая палитра и параметры киоска' },
        { key: 'show_preview_tab', label: 'Вкладка «QR-коды & Ссылки»', desc: 'Генератор и печать QR-кодов столов' },
      ]
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner */}
      <GlassCard style={{ padding: '24px 30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-gold)', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              <Sliders size={16} />
              <span>Конструктор отображения UI</span>
            </div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', color: '#fff', margin: '4px 0 0' }}>
              Управление элементами интерфейса
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0' }}>
              Включайте и отключайте любые кнопки, цены, бейджи и звуки. Изменения моментально применяются на телефонах гостей.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {savedSuccess && (
              <span style={{ color: '#10b981', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                <Check size={16} /> Настройки применены!
              </span>
            )}
            <GoldButton
              variant="primary"
              size="md"
              icon={Check}
              disabled={isSaving}
              onClick={handleSave}
            >
              {isSaving ? 'Сохранение...' : 'Сохранить настройки UI'}
            </GoldButton>
          </div>
        </div>
      </GlassCard>

      {/* Sections Grid */}
      {SECTIONS.map((sec) => {
        const Icon = sec.icon;
        const secConfig = config[sec.id] || {};

        return (
          <GlassCard key={sec.id} style={{ padding: '28px 32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: sec.color }}>
                  <Icon size={20} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#fff', margin: 0 }}>
                  {sec.title}
                </h3>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setAllInSection(sec.id, true)}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer' }}
                >
                  Включить все
                </button>
                <button
                  type="button"
                  onClick={() => setAllInSection(sec.id, false)}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', borderRadius: '8px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer' }}
                >
                  Выключить все
                </button>
              </div>
            </div>

            {/* Grid of Toggles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
              {sec.items.map((item) => {
                const isEnabled = secConfig[item.key] !== false; // По умолчанию включено

                return (
                  <div
                    key={item.key}
                    onClick={() => toggle(sec.id, item.key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 16px',
                      borderRadius: '14px',
                      backgroundColor: isEnabled ? 'rgba(212, 175, 55, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      border: isEnabled ? '1px solid rgba(212, 175, 55, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ flex: 1, paddingRight: '12px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: isEnabled ? '#fff' : 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isEnabled ? <Eye size={14} color="var(--accent-gold)" /> : <EyeOff size={14} color="var(--text-dim)" />}
                        <span>{item.label}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {item.desc}
                      </div>
                    </div>

                    {/* Apple-Style Switch */}
                    <div
                      style={{
                        width: '44px',
                        height: '24px',
                        borderRadius: '12px',
                        backgroundColor: isEnabled ? 'var(--accent-gold)' : 'rgba(255, 255, 255, 0.15)',
                        position: 'relative',
                        transition: 'background-color 0.2s ease',
                        flexShrink: 0
                      }}
                    >
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: isEnabled ? '#000' : '#fff',
                          position: 'absolute',
                          top: '2px',
                          left: isEnabled ? '22px' : '2px',
                          transition: 'left 0.2s ease',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.4)'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        );
      })}

      {/* Floating Save Bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
        <GoldButton
          variant="primary"
          size="lg"
          icon={Check}
          disabled={isSaving}
          onClick={handleSave}
          style={{ minWidth: '240px', justifyContent: 'center' }}
        >
          {isSaving ? 'Сохранение...' : 'Применить настройки UI'}
        </GoldButton>
      </div>
    </div>
  );
};
