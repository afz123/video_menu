# РОЛЬ И СИСТЕМНЫЙ КОНТЕКСТ
Ты выступаешь в роли **Principal Enterprise Solutions Architect & Staff Full-Stack Systems Lead** (стек: FastAPI, asyncpg/SQLAlchemy 2.0, PostgreSQL 16, React 18, Vite, WebKit/iOS Safari).

Предмет работы: Платформа **«Digital Video Menu, Smart Interactive Kiosk, Multi-Floor Spatial Booking & Staff Dispatcher»**.

Архитектурная специфика проекта:
- **Архитектура Multi-Tenant & Pay-per-Module**: каждое заведение изолировано по `slug`, модули лицензируются в `Restaurant.enabled_modules`, а настройки отображения хранятся в JSONB `theme_config` (с узлом `ui_config`).
- **SWR-кеширование (Stale-While-Revalidate)** в `menuService.js` (0ms Cold Start для мобильных клиентов и киосков).
- **Сенсорный Kiosk**: аппаратный сброс WebKit-декодеров (`video.removeAttribute('src')`), таймер неактивности (45s) и Zero-Trace PII Purge.
- **Антифрод & Отказоустойчивость**: HMAC-SHA256 подписи столов и PostgreSQL Advisory Locks (`pg_advisory_xact_lock`) против овербукинга.

---

# ГЛАВНАЯ ЦЕЛЬ (FEATURE REQUIREMENT)
Реализовать **Двухуровневую модульную архитектуру коммерческой упаковки и гранулярного отключения узлов (Two-Tier Pay-per-Module & Zero-Code Feature Flags Engine)**:

> **1. Уровень 1: Коммерческие модули подписки (`enabled_modules`)** — система продается как LEGO-конструктор по отдельным тарифам:
> - `menu` (Core): Видеолента Reels, ASMR-звук, мультиязычность, стоп-лист (Базовый, всегда активен).
> - `ordering`: Корзина, выбор курсов подачи (Курс 1, 2, 3), модификаторы, отправка чека в зал/цех.
> - `service_dispatch`: Вызовы официанта, сомелье, кальянщика, управляющего, запрос счета, Telegram-бот смены.
> - `guest_finance`: Fintech-сплит чека («Кто что ел + общий стол»), чаевые (0/10/15/20%), сервисный сбор.
> - `reservations`: Онлайн-бронь, интерактивная 3D/фото-карта (1F, 2F, VIP), шахматка хостес, Pacing кухни.
> - `kiosk`: Уличная витрина (/kiosk/:slug), рекламный Attract-режим, сброс ПДн, QR-мост на смартфон.
> - `kds`: Кухонный дисплей поваров (/kds/:slug), тайминг готовки (SLA), звуковой гонг, оповещение официанта.
>
> **2. Уровень 2: Гранулярный Конструктор UI (`ui_config`)** — попиксельное скрытие тумблерами любых кнопок, плашек, цен, бейджей и вкладок админки внутри разрешенных модулей.

---

# ЖЕСТКИЕ ПРАВИЛА И СИСТЕМНЫЕ ОГРАНИЧЕНИЯ (SYSTEM GUARDRAILS)

1. **Принцип нулевой связанности (Zero-Coupling & Graceful Degradation):**
   - Если модуль не оплачен / не включен в `enabled_modules`:
     - Роуты `/kiosk/:slug` и `/kds/:slug` **НЕ ДОЛЖНЫ падать с ошибками или показывать белый экран**. Вместо этого отображается фирменная люксовая заглушка с кнопкой перехода в меню.
     - Элементы UI (кнопка «В заказ», сервисная планка вызова официанта, кнопки бронирования) **физически демонтируются из DOM**, не оставляя пустых отступов и ошибок в консоли.
     - Бэкенд-эндпоинты отключенных модулей прерывают выполнение защитным гардом `require_module(restaurant, module_name)` со статусом `403 Forbidden`.
2. **Принцип Fallback Safety (`!== false`):**
   - Любая проверка флага UI в JSX ОБЯЗАНА использовать строгое отрицание `section.show_feature !== false`.
   - Если ключ отсутствует в базе, равен `undefined` или `null` — элемент ОБЯЗАН отображаться.
3. **Абсолютная целостность структуры UI Config (8 секций):**
   - Конструктор интерфейса обязан содержать ровно **8 корневых узлов**:
     `[admin_tabs, header, dish_card, service_bar, cart, kiosk, kitchen_pacing, kds]`.
4. **Защита от самоблокировки администратора (Admin Deadlock Prevention):**
   - Вкладку `ui_config_tab` технически запрещено скрывать намертво. При значении `false` система обязана сохранять аварийный доступ администратора к конструктору UI.
5. **Синхронизация мутаций с базой данных (flag_modified):**
   - При сохранении `ui_config` и `enabled_modules` через FastAPI обязательно вызывать `flag_modified(restaurant, "theme_config")`, чтобы asyncpg фиксировал мутацию JSONB в PostgreSQL.
6. **Инвалидация Stale-кеша:**
   - Сохранение лицензий или конфига UI обязано очищать локальный SWR-кеш (`luxury_menu_cache_*`), чтобы устройства гостей и экраны киосков мгновенно обновляли состояние.
7. **Ни строчки псевдокода (Production Ready):**
   - Никаких `// TODO: добавьте здесь`, `/* аналогично для других */` или многоточий. Только 100% законченные, готовые к коммиту файлы.
8. **Статус стабильности ядра:**
   - Не придумывать ложные уязвимости ядра. Отрази статус контуров лаконичной таблицей `[RESOLVED / STABLE]`.

---

# СТРУКТУРА ОТВЕТА

## БЛОК 1. СТАТУС СТАБИЛЬНОСТИ ЯДРА (Лаконичный чеклист)
Сводная таблица подтверждения стабильности:
- Бесколлизионная посадка и блокировка овербукинга (`pg_advisory_xact_lock`).
- Виртуализация видео и сброс декодеров WebKit в iOS Safari (`removeAttribute('src')`).
- Санитизация персональных данных (Zero-Trace PII Purge) на киоске по таймауту.
- Экранирование спецсимволов HTML в Telegram API (`html.escape`).
- Защита от фейковых вызовов (HMAC-SHA256 подписи столов).

## БЛОК 2. СХЕМЫ КОНФИГУРАЦИИ (Манифесты Модулей и UI)
1. **Манифест коммерческих модулей (`MODULES`)**:
   `menu`, `ordering`, `service_dispatch`, `guest_finance`, `reservations`, `kiosk`, `kds`.
2. **Полный JSON-манифест `DEFAULT_UI_CONFIG` (8 узлов)**:
   - `admin_tabs`: 8 вкладок (`show_dishes_tab`, `show_reservations_tab`, `show_service_requests_tab`, `show_ui_config_tab`, `show_categories_tab`, `show_settings_tab`, `show_theme_tab`, `show_preview_tab`).
   - `header`: 8 узлов (`show_brand_name`, `show_table_badge`, `show_change_table_btn`, `show_language_picker`, `show_categories_drawer`, `show_category_pills`, `show_dietary_chips`, `show_table_booking_btn`).
   - `dish_card`: 13 узлов (`show_sound_toggle`, `show_slide_counter`, `show_badges`, `show_price`, `show_short_description`, `show_sommelier_pairing`, `show_weight`, `show_calories`, `show_allergens`, `show_ingredients`, `show_serving_details`, `show_details_toggle`, `show_add_to_cart_btn`).
   - `service_bar`: 10 узлов (`show_service_bar`, `show_call_waiter_btn`, `show_request_bill_btn`, `show_cart_btn`, `show_quick_requests`, `show_nps_rating`, `show_comment_input`, `allow_call_sommelier`, `allow_call_hookah`, `allow_call_admin`).
   - `cart`: 7 узлов (`allow_self_ordering`, `show_service_charge`, `show_waiter_screen_btn`, `show_live_status_tracker`, `show_split_bill`, `show_smart_item_split`, `show_tip_tiers`).
   - `kiosk`: 6 узлов (`show_mini_qr`, `show_booking_btn`, `show_qr_bridge_btn`, `show_details_modal`, `allow_sound_in_modal`, `show_floor_plan`).
   - `kitchen_pacing`: 5 узлов (`enable_courses_system`, `enable_kitchen_pacing`, `enable_waiter_call_cooldown`, `cooldown_seconds`, `max_pacing_tables_per_slot`).
   - `kds`: 4 узла (`enable_kds_system`, `sound_alerts_enabled`, `notify_waiter_on_ready`, `alert_critical_delay_minutes`).

## БЛОК 3. ГОТОВЫЕ ФАЙЛЫ ДЛЯ КОММИТА (Full Production Code)
Предоставь полные, готовые к коммиту файлы:
1. `backend/app/core/licensing.py` — функция проверки прав `require_module` для защиты API-маршрутов.
2. `frontend/src/context/ModuleContext.jsx` — контекст лицензий с хуком `useModules()` и проверкой `hasModule(key)`.
3. `frontend/src/context/UIConfigContext.jsx` — контекст гранулярного UI с глубоким слиянием дефолтов по всем 8 секциям.
4. `frontend/src/App.jsx` — корневой роутер с мягкой изоляцией неподключенных роутов (`/kiosk`, `/kds`).
5. `frontend/src/features/admin/LicenseModuleManager.jsx` — экран панели управления для подключения/отключения тарифных пакетов заведения.
6. `frontend/src/features/admin/UIConfigManager.jsx` — визуальный конструктор всех 8 секций с Apple-style тумблерами и групповым включением.
7. `frontend/src/features/admin/DashboardLayout.jsx` — динамический рендеринг вкладок админки на базе лицензий и UI-флагов.
8. `frontend/src/features/mobile_menu/MobileFeed.jsx` — двухуровневая интеграция (`hasModule` + `uiConfig`) в карточки блюд, шапку и сервисную панель.
9. `frontend/src/features/mobile_menu/DishSlide.jsx` — 100% оборачивание узлов карточки и видеоплеера в проверки `card.show_* !== false`.
10. `frontend/src/features/mobile_menu/CartDrawer.jsx` — оборачивание кнопок сплита, чаевых, экрана официанта, сервисного сбора и прямой отправки в `cart.show_* !== false`.