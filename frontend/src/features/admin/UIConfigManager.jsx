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
  ChefHat
} from 'lucide-react';

export const UIConfigManager = ({ restaurantSlug, initialConfig, onSaved }) => {
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
        { key: 'allow_call_admin', label: 'Вызов управляющего (👔)', desc: 'Разрешить гостям звать администратора зала' }
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
        { key: 'show_service_charge', label: 'Строка «Обслуживание (10%)»', desc: 'Отображение сервисного сбора в чеке' },
        { key: 'show_live_status_tracker', label: 'Живой трекер статуса заказа', desc: 'Индикатор: Принят -> Готовится -> Подача' },
        { key: 'show_split_bill', label: 'Калькулятор разделения счета (Split-Bill)', desc: 'Разделение суммы между гостями на 1–6 персон' },
        { key: 'show_smart_item_split', label: 'Умный расчет «Кто что ел + Общий стол»', desc: 'Позволяет отметить личные блюда и разделить общие позиции' },
        { key: 'show_tip_tiers', label: 'Шкала чаевых официанту (10%, 15%, 20%)', desc: 'Быстрые кнопки чаевых команде зала' }
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
            </div>
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
