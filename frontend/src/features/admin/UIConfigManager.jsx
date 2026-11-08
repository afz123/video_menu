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
  Smartphone,
  Tv,
  ShoppingBag,
  Bell,
  Utensils,
  LayoutGrid,
  Flame,
  ChefHat,
  Plus,
  Trash2
} from 'lucide-react';

export const UIConfigManager = ({ restaurantSlug, initialConfig, serviceChargePercent, onSaved }) => {
  const [config, setConfig] = useState(() => {
    const base = {};
    const allSections = new Set([
      ...Object.keys(DEFAULT_UI_CONFIG),
      ...(initialConfig ? Object.keys(initialConfig) : [])
    ]);

    allSections.forEach((sec) => {
      base[sec] = {
        ...(DEFAULT_UI_CONFIG[sec] || {}),
        ...((initialConfig && initialConfig[sec]) || {})
      };
    });
    return base;
  });

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [newBtnLabel, setNewBtnLabel] = useState('');
  const [newBtnIcon, setNewBtnIcon] = useState('🛎️');
  const [newQuickReqText, setNewQuickReqText] = useState('');

  useEffect(() => {
    if (initialConfig) {
      const base = {};
      const allSections = new Set([
        ...Object.keys(DEFAULT_UI_CONFIG),
        ...Object.keys(initialConfig)
      ]);

      allSections.forEach((sec) => {
        base[sec] = {
          ...(DEFAULT_UI_CONFIG[sec] || {}),
          ...(initialConfig[sec] || {})
        };
      });
      setConfig(base);
    }
  }, [initialConfig]);

  const toggle = (section, key) => {
    if (section === 'admin_tabs' && key === 'show_ui_config_tab') {
      alert('Вкладку «Конструктор UI» нельзя отключить, чтобы избежать самоблокировки панели управления.');
      return;
    }
    setConfig((prev) => {
      const currentSection = prev[section] || {};
      const currentValue = currentSection[key] !== false;
      return {
        ...prev,
        [section]: {
          ...currentSection,
          [key]: !currentValue
        }
      };
    });
  };

  const setAllInSection = (section, value) => {
    setConfig((prev) => {
      const updatedSection = {};
      const template = DEFAULT_UI_CONFIG[section] || prev[section] || {};
      Object.keys(template).forEach((k) => {
        // Admin Deadlock Prevention: вкладку конструктора запрещено выключать через групповую операцию
        if (section === 'admin_tabs' && k === 'show_ui_config_tab' && !value) {
          updatedSection[k] = true;
        } else {
          updatedSection[k] = value;
        }
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
        await menuService.updateRestaurant(restaurantSlug, {
          ui_config: config
        });
      }
      // SWR Cache Invalidation: clear local storage menu caches so guest devices & kiosk update instantly
      if (typeof window !== 'undefined') {
        try {
          Object.keys(localStorage).forEach((key) => {
            if (key.startsWith('luxury_menu_cache_')) {
              localStorage.removeItem(key);
            }
          });
        } catch (_) {}
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

  const currentSvcPercent = serviceChargePercent ?? 10;

  const SECTIONS = [
    {
      id: 'admin_tabs',
      title: 'Вкладки панели управления (Admin Panel)',
      icon: LayoutGrid,
      color: '#ec4899',
      items: [
        { key: 'show_dishes_tab', label: 'Вкладка «Позиции меню & Стоп-лист»', desc: 'Управление каталогом блюд, ценами и стоп-листом' },
        { key: 'show_reservations_tab', label: 'Вкладка «Бронирование столов»', desc: 'Журнал броней, шахматка и рассадка' },
        { key: 'show_service_requests_tab', label: 'Вкладка «Вызовы & Заказы»', desc: 'Монитор запросов гостей в реальном времени' },
        { key: 'show_staff_tab', label: 'Вкладка «Сотрудники & Роли (RBAC)»', desc: 'Управление официантами, хостес, поварами и их правами' },
        { key: 'show_ui_config_tab', label: 'Вкладка «Конструктор UI»', desc: 'Переключатели интерфейса и визуальных блоков' },
        { key: 'show_categories_tab', label: 'Вкладка «Управление разделами»', desc: 'Структура разделов кухни и бара' },
        { key: 'show_settings_tab', label: 'Вкладка «Настройки заведения»', desc: 'Реквизиты, контакты, Telegram и пароли' },
        { key: 'show_theme_tab', label: 'Вкладка «Стиль & Kiosk Display»', desc: 'Цветовая палитра и параметры киоска' },
        { key: 'show_preview_tab', label: 'Вкладка «QR-коды & Ссылки»', desc: 'Генератор и печать QR-кодов столов' }
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
        { key: 'show_categories_drawer', label: 'Кнопка меню «Разделы»', desc: 'Нижнее меню быстрого выбора категории' },
        { key: 'show_category_pills', label: 'Горизонтальные табы категорий', desc: 'Кнопки быстрого переключения разделов' },
        { key: 'show_dietary_chips', label: 'Быстрые фильтры («Хиты», «Острое»)', desc: 'Чипсы для моментальной фильтрации' },
        { key: 'show_table_booking_btn', label: 'Кнопка бронирования в меню («Разделы»)', desc: 'Позволяет гостям бронировать стол онлайн прямо из каталога' }
      ]
    },
    {
      id: 'dish_card',
      title: 'Карточка блюда & Видео (Reels)',
      icon: Utensils,
      color: 'var(--accent-gold)',
      items: [
        { key: 'show_sound_toggle', label: 'Кнопка звука ASMR (динамик)', desc: 'Позволяет гостю включать звук шипения/готовки блюда' },
        { key: 'show_slide_counter', label: 'Счетчик слайдов (1/12)', desc: 'Индикатор номера текущего блюда в категории' },
        { key: 'show_badges', label: 'Маркетинговые бейджи', desc: 'Плашки «Хит», «Выбор Шефа», «NEW», «Острое» поверх видео' },
        { key: 'show_price', label: 'Стоимость блюда и валюта', desc: 'Отображение цены позиции' },
        { key: 'show_short_description', label: 'Краткое описание', desc: 'Текст описания под названием блюда' },
        { key: 'show_sommelier_pairing', label: 'Блок винного пейринга', desc: 'Рекомендация бокала вина / напитка к блюду (+18% к чеку)' },
        { key: 'show_weight', label: 'Выход блюда / Граммовка', desc: 'Вес порции (например: 350 г или 400 мл)' },
        { key: 'show_calories', label: 'Калории (Ккал / БЖУ)', desc: 'Энергетическая ценность блюда' },
        { key: 'show_allergens', label: 'Предупреждение об аллергенах', desc: 'Орехи, лактоза, глютен и др.' },
        { key: 'show_ingredients', label: 'Полный состав и ингредиенты', desc: 'Подробный список компонентов в карточке' },
        { key: 'show_serving_details', label: 'Особенности подачи от шефа', desc: 'Температура, гарнировка, соусы' },
        { key: 'show_details_toggle', label: 'Кнопка «Подробнее / Скрыть»', desc: 'Разворачивание полного состава по тапу' },
        { key: 'show_add_to_cart_btn', label: 'Кнопка «В заказ / Настроить»', desc: 'Если выключить — меню превращается в презентационный каталог' }
      ]
    },
    {
      id: 'service_bar',
      title: 'Нижняя сервисная планка (Вызовы & Счёт)',
      icon: Bell,
      color: '#eab308',
      groups: [
        {
          title: '1. Основные кнопки планки',
          desc: 'Кнопки, которые видит гость внизу экрана на мобильном телефоне',
          items: [
            { key: 'show_service_bar', label: 'Вся нижняя планка целиком', desc: 'Главный мастер-переключатель нижней панели' },
            { key: 'show_call_waiter_btn', label: 'Кнопка «Позвать официанта»', desc: 'Открывает окно выбора специалиста и быстрых просьб' },
            { key: 'show_request_bill_btn', label: 'Кнопка «Счёт»', desc: 'Открывает выбор оплаты (карта/наличные) и оценку визита' },
            { key: 'show_cart_btn', label: 'Кнопка «Заказ (Корзина)»', desc: 'Отображение кнопки корзины со счетчиком блюд' }
          ]
        },
        {
          title: '2. Дополнительные опции в окне вызова и счёта',
          desc: 'Элементы внутри всплывающего окна гостя',
          items: [
            { key: 'show_quick_requests', label: 'Быстрые просьбы в 1 тап', desc: 'Чипсы: «Лёд и вода», «Приборы и салфетки», «Лимон»...' },
            { key: 'show_comment_input', label: 'Поле текстового комментария', desc: 'Поле для ввода произвольного текста или пожелания' },
            { key: 'show_nps_rating', label: 'Оценка визита 1-5 звезд', desc: 'NPS-оценка перед запросом счёта' }
          ]
        }
      ]
    },
    {
      id: 'cart',
      title: 'Корзина и Оформление заказа',
      icon: ShoppingBag,
      color: '#10b981',
      items: [
        { key: 'wishlist_only_mode', label: 'Режим «Список блюд / Блокнот»', desc: 'Корзина работает как список желаний гостя без фиксации чека и отправки на кухню' },
        { key: 'allow_self_ordering', label: 'Кнопка «Отправить заказ на кухню»', desc: 'Прямая отправка заказа в зал/цех' },
        { key: 'show_waiter_screen_btn', label: 'Кнопка «Показать официанту»', desc: 'Полноэкранный режим показа экрана при личном заказе' },
        { 
          key: 'show_service_charge', 
          label: `Сервисный сбор за обслуживание (${currentSvcPercent}%)`, 
          desc: `Обязательный сбор заведения в чеке гостя (настраивается в «Настройки заведения»). При выключении — сбор не начисляется.` 
        },
        { 
          key: 'show_tip_tiers', 
          label: 'Добровольные чаевые официанту (10%, 15%, 20%)', 
          desc: 'Кнопки быстрой благодарности персоналу по желанию гостя в корзине' 
        },
        { key: 'show_live_status_tracker', label: 'Живой трекер статуса заказа', desc: 'Индикатор: Принят -> Готовится -> Подача' },
        { key: 'show_split_bill', label: 'Калькулятор разделения счета (Split-Bill)', desc: 'Разделение суммы между гостями на 1–6 персон' },
        { key: 'show_smart_item_split', label: 'Умный расчет «Кто что ел + Общий стол»', desc: 'Позволяет отметить личные блюда и разделить общие позиции' },
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
        { key: 'show_floor_plan', label: 'Интерактивная карта залов и столов (Floor Plan)', desc: 'Визуальный выбор стола на плане ресторана' }
      ]
    },
    {
      id: 'kitchen_pacing',
      title: 'Кухня, Курсы подачи и Защита от завала',
      icon: Flame,
      color: '#f97316',
      items: [
        { 
          key: 'enable_courses_system', 
          label: 'Курсовая подача (Курс 1 — Закуски, Курс 2 — Горячее)', 
          desc: 'Позволяет гостю выбирать порядок подачи блюд. Защищает гриль от перегруза и не дает стейкам остыть. При выключении — заказ идет единым списком.' 
        },
        { 
          key: 'enable_kitchen_pacing', 
          label: 'Pacing кухни (Лимит посадки 3 стола на 30 мин)', 
          desc: 'Предотвращает «посадочные пробки», когда хостес сажает весь зал одновременно и кухня встает. При выключении — брони доступны до физической емкости зала.' 
        },
        { 
          key: 'enable_waiter_call_cooldown', 
          label: 'Защита от спама официанта (Пауза 45 секунд)', 
          desc: 'Блокирует повторные нажатия вызова с одного стола, спасая персонал от нервного выгорания. Гость видит сообщение и статус вызова.' 
        }
      ]
    },
    {
      id: 'kds',
      title: 'Кухонный экран (KDS) & Диспетчер шефа',
      icon: ChefHat,
      color: '#10b981',
      items: [
        { 
          key: 'enable_kds_system', 
          label: 'Включить кухонный экран KDS (/kds/:slug)', 
          desc: 'Заказы гостей моментально отображаются на планшете поваров. Если выключено — ресторан работает по старинке через чек или Telegram без вреда для системы.' 
        },
        { 
          key: 'sound_alerts_enabled', 
          label: 'Звуковой сигнал при новом чеке', 
          desc: 'Громкий благозвучный гонг в планшете кухни при падении нового заказа от гостя.' 
        },
        { 
          key: 'notify_waiter_on_ready', 
          label: 'Пуш официанту «Блюдо готово на раздаче»', 
          desc: 'Отправляет сигнал и сообщение в Telegram официанту в ту же секунду, когда повар нажал кнопку «Готово».' 
        }
      ]
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
              Включайте и отключайте любые кнопки, цены, бейджи, звуки и вкладки админки. Изменения моментально сохраняются в БД.
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

            {/* If section has structured sub-groups (e.g. Service Bar) */}
            {sec.groups ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {sec.groups.map((grp, gIdx) => (
                  <div
                    key={gIdx}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.015)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '16px',
                      padding: '18px 20px'
                    }}
                  >
                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>
                        {grp.title}
                      </div>
                      {grp.desc && (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {grp.desc}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
                      {grp.items.map((item) => {
                        const isEnabled = secConfig[item.key] !== false;
                        return (
                          <div
                            key={item.key}
                            onClick={() => toggle(sec.id, item.key)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 14px',
                              borderRadius: '12px',
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

                            <div
                              style={{
                                width: '40px',
                                height: '22px',
                                borderRadius: '11px',
                                backgroundColor: isEnabled ? 'var(--accent-gold)' : 'rgba(255, 255, 255, 0.15)',
                                position: 'relative',
                                transition: 'background-color 0.2s ease',
                                flexShrink: 0
                              }}
                            >
                              <div
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  borderRadius: '50%',
                                  backgroundColor: isEnabled ? '#000' : '#fff',
                                  position: 'absolute',
                                  top: '2px',
                                  left: isEnabled ? '20px' : '2px',
                                  transition: 'left 0.2s ease',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.4)'
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                {sec.items.map((item) => {
                  const isEnabled = secConfig[item.key] !== false;

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
            )}

            {sec.id === 'service_bar' && (
              <>
                {/* Manage Staff Call Buttons (Динамический список кнопок вызова: Официант, Сомелье, Кальянщик...) */}
                {(() => {
                  const staffList = secConfig.staff_call_buttons || (
                    secConfig.custom_call_buttons && secConfig.custom_call_buttons.length > 0
                      ? secConfig.custom_call_buttons
                      : [
                          { id: 'waiter', label: 'Официант', icon: '🛎️', enabled: true },
                          { id: 'sommelier', label: 'Сомелье', icon: '🍷', enabled: true },
                          { id: 'hookah', label: 'Кальянщик', icon: '💨', enabled: true },
                          { id: 'admin', label: 'Управляющий', icon: '👔', enabled: true }
                        ]
                  );

                  return (
                    <div style={{
                      marginTop: '20px',
                      padding: '20px',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: '16px',
                      border: '1px solid rgba(212, 175, 55, 0.25)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>🛎️ Кнопки вызова («Кого пригласить к столу»)</span>
                            <span style={{ fontSize: '11px', color: 'var(--accent-gold)', background: 'rgba(212,175,55,0.15)', padding: '2px 8px', borderRadius: '10px' }}>
                              {staffList.length} кнопок
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Полный контроль над кнопками: удаляйте ненужные (кальянщик, сомелье или официант), временно скрывайте или создавайте любые свои («Детский стул», «Бармен», «Плед»).
                          </div>
                        </div>
                      </div>

                      {/* Buttons list */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                        {staffList.length === 0 ? (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px 0' }}>
                            Все кнопки удалены. Добавьте нужные кнопки ниже.
                          </div>
                        ) : (
                          staffList.map((btn, bIdx) => {
                            const isBtnActive = btn.enabled !== false;
                            return (
                              <div
                                key={btn.id || bIdx}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '12px 16px',
                                  backgroundColor: 'rgba(0, 0, 0, 0.35)',
                                  borderRadius: '12px',
                                  border: isBtnActive ? '1px solid rgba(212,175,55,0.25)' : '1px solid rgba(255, 255, 255, 0.08)'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <span style={{ fontSize: '22px' }}>{btn.icon || '🛎️'}</span>
                                  <div>
                                    <div style={{ fontSize: '14px', fontWeight: '600', color: isBtnActive ? '#fff' : 'var(--text-muted)' }}>
                                      {btn.label}
                                    </div>
                                    <div style={{ fontSize: '11px', color: isBtnActive ? 'var(--accent-gold)' : 'var(--text-dim)', marginTop: '1px' }}>
                                      {isBtnActive ? '✓ Активна на экране гостя' : '✕ Скрыта от гостей'}
                                    </div>
                                  </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = staffList.map((b, i) =>
                                        i === bIdx ? { ...b, enabled: !isBtnActive } : b
                                      );
                                      setConfig((prev) => ({
                                        ...prev,
                                        service_bar: {
                                          ...prev.service_bar,
                                          staff_call_buttons: updated,
                                          custom_call_buttons: updated
                                        }
                                      }));
                                    }}
                                    style={{
                                      background: isBtnActive ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                      color: isBtnActive ? 'var(--accent-gold)' : 'var(--text-muted)',
                                      border: isBtnActive ? '1px solid var(--accent-gold)' : '1px solid rgba(255, 255, 255, 0.1)',
                                      borderRadius: '8px',
                                      padding: '6px 12px',
                                      fontSize: '11px',
                                      fontWeight: '600',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {isBtnActive ? 'Включено' : 'Выключено'}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = staffList.filter((_, i) => i !== bIdx);
                                      setConfig((prev) => ({
                                        ...prev,
                                        service_bar: {
                                          ...prev.service_bar,
                                          staff_call_buttons: updated,
                                          custom_call_buttons: updated
                                        }
                                      }));
                                    }}
                                    style={{
                                      background: 'rgba(239, 68, 68, 0.12)',
                                      color: '#f87171',
                                      border: '1px solid rgba(239, 68, 68, 0.3)',
                                      borderRadius: '8px',
                                      padding: '6px 10px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontSize: '11px',
                                      fontWeight: '600'
                                    }}
                                    title="Удалить кнопку навсегда"
                                  >
                                    <Trash2 size={13} />
                                    <span>Удалить</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Add new call button form */}
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        padding: '14px',
                        backgroundColor: 'rgba(0, 0, 0, 0.45)',
                        borderRadius: '12px',
                        border: '1px dashed rgba(212, 175, 55, 0.3)'
                      }}>
                        <select
                          value={newBtnIcon}
                          onChange={(e) => setNewBtnIcon(e.target.value)}
                          style={{
                            backgroundColor: 'rgba(20, 20, 25, 0.95)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: '#fff',
                            borderRadius: '8px',
                            padding: '8px 10px',
                            fontSize: '16px',
                            cursor: 'pointer',
                            outline: 'none'
                          }}
                        >
                          <option value="🛎️">🛎️ Официант / Звонок</option>
                          <option value="🍷">🍷 Сомелье</option>
                          <option value="💨">💨 Кальянщик</option>
                          <option value="👔">👔 Управляющий</option>
                          <option value="🪑">🪑 Детский стул</option>
                          <option value="🧣">🧣 Плед</option>
                          <option value="🍸">🍸 Бармен</option>
                          <option value="☕">☕ Бариста</option>
                          <option value="🧊">🧊 Доп. лёд</option>
                          <option value="🥢">🥢 Палочки / Приборы</option>
                          <option value="🧂">🧂 Специи / Соль</option>
                          <option value="🔌">🔌 Зарядка / Powerbank</option>
                          <option value="🚕">🚕 Вызов такси</option>
                          <option value="🧼">🧼 Салфетки</option>
                          <option value="⭐">⭐ Особая просьба</option>
                        </select>

                        <input
                          type="text"
                          placeholder="Название кнопки (например: «Кальянщик» или «Детский стул»)"
                          value={newBtnLabel}
                          onChange={(e) => setNewBtnLabel(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newBtnLabel.trim()) {
                                const newId = `btn_${Date.now()}`;
                                const newBtn = {
                                  id: newId,
                                  label: newBtnLabel.trim(),
                                  icon: newBtnIcon,
                                  enabled: true
                                };
                                const updated = [...staffList, newBtn];
                                setConfig((prev) => ({
                                  ...prev,
                                  service_bar: {
                                    ...prev.service_bar,
                                    staff_call_buttons: updated,
                                    custom_call_buttons: updated
                                  }
                                }));
                                setNewBtnLabel('');
                              }
                            }
                          }}
                          style={{
                            flex: 1,
                            minWidth: '220px',
                            backgroundColor: 'rgba(20, 20, 25, 0.95)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: '#fff',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            fontSize: '13px',
                            outline: 'none'
                          }}
                        />

                        <GoldButton
                          variant="primary"
                          type="button"
                          icon={Plus}
                          onClick={() => {
                            if (!newBtnLabel.trim()) return;
                            const newId = `btn_${Date.now()}`;
                            const newBtn = {
                              id: newId,
                              label: newBtnLabel.trim(),
                              icon: newBtnIcon,
                              enabled: true
                            };
                            const updated = [...staffList, newBtn];
                            setConfig((prev) => ({
                              ...prev,
                              service_bar: {
                                ...prev.service_bar,
                                staff_call_buttons: updated,
                                custom_call_buttons: updated
                              }
                            }));
                            setNewBtnLabel('');
                          }}
                          style={{ padding: '8px 16px', fontSize: '13px' }}
                        >
                          Добавить кнопку
                        </GoldButton>
                      </div>
                    </div>
                  );
                })()}

                {/* Manage Quick Requests chips (Быстрые просьбы) */}
                <div style={{
                  marginTop: '16px',
                  padding: '20px',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '16px',
                  border: '1px solid rgba(212, 175, 55, 0.2)'
                }}>
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🧊 5. Список быстрых просьб к столу</span>
                      <span style={{ fontSize: '11px', color: 'var(--accent-gold)', background: 'rgba(212,175,55,0.15)', padding: '2px 8px', borderRadius: '10px' }}>
                        {(secConfig.quick_requests_list || [
                          '🧊 Лёд и вода',
                          '🥢 Приборы и салфетки',
                          '🍋 Лимон к чаю',
                          '🧂 Соль / перец',
                          '🥫 Дополнительный соус'
                        ]).length} просьб
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Управляйте готовыми кнопками-просьбами для гостя. Ненужные можно удалить нажатием на крестик.
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                    {(secConfig.quick_requests_list || [
                      '🧊 Лёд и вода',
                      '🥢 Приборы и салфетки',
                      '🍋 Лимон к чаю',
                      '🧂 Соль / перец',
                      '🥫 Дополнительный соус'
                    ]).map((req, rIdx) => (
                      <div
                        key={rIdx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          backgroundColor: 'rgba(212, 175, 55, 0.1)',
                          border: '1px solid rgba(212, 175, 55, 0.3)',
                          borderRadius: '20px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          color: '#fff'
                        }}
                      >
                        <span>{req}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const currentList = secConfig.quick_requests_list || [
                              '🧊 Лёд и вода',
                              '🥢 Приборы и салфетки',
                              '🍋 Лимон к чаю',
                              '🧂 Соль / перец',
                              '🥫 Дополнительный соус'
                            ];
                            const updated = currentList.filter((_, i) => i !== rIdx);
                            setConfig((prev) => ({
                              ...prev,
                              service_bar: {
                                ...prev.service_bar,
                                quick_requests_list: updated
                              }
                            }));
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#f87171',
                            cursor: 'pointer',
                            padding: '0 2px',
                            display: 'flex',
                            alignItems: 'center',
                            fontSize: '14px',
                            fontWeight: '700'
                          }}
                          title="Удалить просьбу"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', maxWidth: '480px' }}>
                    <input
                      type="text"
                      placeholder="Новая просьба (например: 🧻 Влажные салфетки)"
                      value={newQuickReqText}
                      onChange={(e) => setNewQuickReqText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newQuickReqText.trim()) {
                            const currentList = secConfig.quick_requests_list || [
                              '🧊 Лёд и вода',
                              '🥢 Приборы и салфетки',
                              '🍋 Лимон к чаю',
                              '🧂 Соль / перец',
                              '🥫 Дополнительный соус'
                            ];
                            setConfig((prev) => ({
                              ...prev,
                              service_bar: {
                                ...prev.service_bar,
                                quick_requests_list: [...currentList, newQuickReqText.trim()]
                              }
                            }));
                            setNewQuickReqText('');
                          }
                        }
                      }}
                      style={{
                        flex: 1,
                        backgroundColor: 'rgba(20, 20, 25, 0.9)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#fff',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '13px',
                        outline: 'none'
                      }}
                    />
                    <GoldButton
                      variant="outline"
                      type="button"
                      icon={Plus}
                      onClick={() => {
                        if (!newQuickReqText.trim()) return;
                        const currentList = secConfig.quick_requests_list || [
                          '🧊 Лёд и вода',
                          '🥢 Приборы и салфетки',
                          '🍋 Лимон к чаю',
                          '🧂 Соль / перец',
                          '🥫 Дополнительный соус'
                        ];
                        setConfig((prev) => ({
                          ...prev,
                          service_bar: {
                            ...prev.service_bar,
                            quick_requests_list: [...currentList, newQuickReqText.trim()]
                          }
                        }));
                        setNewQuickReqText('');
                      }}
                      style={{ padding: '8px 14px', fontSize: '12px' }}
                    >
                      Добавить
                    </GoldButton>
                  </div>
                </div>
              </>
            )}

              {sec.id === 'kitchen_pacing' && (
                <div style={{
                  gridColumn: '1 / -1',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '14px',
                  marginTop: '10px',
                  padding: '16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '14px',
                  border: '1px solid rgba(255, 255, 255, 0.06)'
                }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      Задержка на повторный вызов официанта (секунд):
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="300"
                      value={secConfig.cooldown_seconds ?? 45}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        kitchen_pacing: {
                          ...prev.kitchen_pacing,
                          cooldown_seconds: parseInt(e.target.value, 10) || 45
                        }
                      }))}
                      style={{
                        width: '100%',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        color: 'var(--accent-gold)',
                        fontWeight: '700',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      Лимит новых столов на один 30-мин слот (Pacing кухни):
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={secConfig.max_pacing_tables_per_slot ?? 3}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        kitchen_pacing: {
                          ...prev.kitchen_pacing,
                          max_pacing_tables_per_slot: parseInt(e.target.value, 10) || 3
                        }
                      }))}
                      style={{
                        width: '100%',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        color: 'var(--accent-gold)',
                        fontWeight: '700',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>
              )}
          </GlassCard>
        );
      })}

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
