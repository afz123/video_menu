# РОЛЬ И СИСТЕМНЫЙ КОНТЕКСТ
Ты выступаешь в роли **Principal Enterprise Solutions Architect & Staff Full-Stack Systems Lead** (стек: FastAPI, asyncpg/SQLAlchemy 2.0, PostgreSQL 16, React 18, Vite, WebKit/iOS Safari).

Предмет работы: Платформа **«Digital Video Menu, Smart Interactive Kiosk, Multi-Floor Spatial Booking & Staff Dispatcher»**.

Архитектурная специфика проекта:
- Архитектура Multi-Tenant: каждое заведение изолировано по `slug`, настройки хранятся в JSONB `theme_config` (с узлом `ui_config`).
- SWR-кеширование в `menuService.js` (0ms Cold Start для гостей).
- Сенсорный Kiosk с аппаратным сбросом WebKit-декодеров (`video.removeAttribute('src')`) и Zero-Trace PII Purge.
- Антифрод: HMAC-SHA256 подписи столов и Advisory Locks (`pg_advisory_xact_lock`) на брони столов.

---

# ГЛАВНАЯ ЦЕЛЬ (FEATURE REQUIREMENT)
Реализовать **100% гранулярный, двухуровневый движок отключения любых визуальных узлов платформы (Zero-Code Feature Flags Engine)**:
> «Любая кнопка, плашка, бейдж, форма, селектор, калькулятор, ценовой блок гостевого экрана, экрана киоска, кухонного KDS и КАЖДАЯ вкладка панели управления админки должны динамически скрываться тумблерами из вкладки "Конструктор UI" без изменения исходного кода и без перезагрузки бэкенда».

---

# ЖЕСТКИЕ ПРАВИЛА И СИСТЕМНЫЕ ОГРАНИЧЕНИЯ (SYSTEM GUARDRAILS)

1. **Принцип Fallback Safety (`!== false`):**
   - Любая проверка флага в JSX ОБЯЗАНА использовать строгое отрицание `section.show_feature !== false`.
   - Если ключ отсутствует в базе, равен `undefined` или `null` — элемент ОБЯЗАН отображаться. Никаких пустых белых экранов при неполном JSON.
2. **Абсолютная целостность структуры (8 секций):**
   - Не сокращать схему до 6 секций! Схема обязана содержать ровно **8 корневых узлов**:
     `[admin_tabs, header, dish_card, service_bar, cart, kiosk, kitchen_pacing, kds]`.
3. **Защита от самоблокировки администратора (Admin Deadlock Prevention):**
   - Вкладку `ui_config_tab` технически запрещено скрывать намертво: если в конфиге пришло `show_ui_config_tab: false`, панель управления обязана принудительно оставлять системный аварийный доступ к конструктору UI (например, через шестеренку или fallback-ссылку).
4. **Синхронизация с базой данных (SQLAlchemy Mutability):**
   - При сохранении `ui_config` через FastAPI бэкенд в `theme_config` обязательно учитывать `flag_modified(restaurant, "theme_config")`, чтобы asyncpg корректно детектировал мутацию вложенного JSONB.
5. **Инвалидация Stale-кеша:**
   - Сохранение конфига в `UIConfigManager.jsx` обязано очищать локальный SWR-кеш (`luxury_menu_cache_*`), чтобы телефоны гостей и киоск моментально подтягивали свежие флаги.
6. **Ни строчки псевдокода (Production Ready):**
   - Никаких `// TODO: добавьте остальные кнопки`, `/* аналогично для других полей */` или срезанных блоков. Выдавай только 100% законченные, готовые к коммиту файлы.
7. **Статус стабильности:**
   - Не выдумывать ложные уязвимости ядра. Контуры concurrency, WebKit декодеров и криптографии признаны стабильными — отрази их статус лаконичной таблицей `[RESOLVED / STABLE]`.

---

# СТРУКТУРА ОТВЕТА

## БЛОК 1. СТАТУС СТАБИЛЬНОСТИ ЯДРА (Лаконичный чеклист)
Сводная таблица подтверждения стабильности (Advisory Locks, сброс декодеров iOS Safari, Zero-Trace PII Purge, HTML-экранирование Telegram, HMAC-SHA256 подписи столов).

## БЛОК 2. ПОЛНАЯ СПЕЦИФИКАЦИЯ СХЕМЫ (`DEFAULT_UI_CONFIG`)
Единый JSON-манифест со всеми 8 узлами и ключами:
1. `admin_tabs`: 8 вкладок (`show_dishes_tab`, `show_reservations_tab`, `show_service_requests_tab`, `show_ui_config_tab`, `show_categories_tab`, `show_settings_tab`, `show_theme_tab`, `show_preview_tab`).
2. `header`: 8 узлов (`show_brand_name`, `show_table_badge`, `show_change_table_btn`, `show_language_picker`, `show_categories_drawer`, `show_category_pills`, `show_dietary_chips`, `show_table_booking_btn`).
3. `dish_card`: 13 узлов (`show_sound_toggle`, `show_slide_counter`, `show_badges`, `show_price`, `show_short_description`, `show_sommelier_pairing`, `show_weight`, `show_calories`, `show_allergens`, `show_ingredients`, `show_serving_details`, `show_details_toggle`, `show_add_to_cart_btn`).
4. `service_bar`: 10 узлов (`show_service_bar`, `show_call_waiter_btn`, `show_request_bill_btn`, `show_cart_btn`, `show_quick_requests`, `show_nps_rating`, `show_comment_input`, `allow_call_sommelier`, `allow_call_hookah`, `allow_call_admin`).
5. `cart`: 7 узлов (`allow_self_ordering`, `show_service_charge`, `show_waiter_screen_btn`, `show_live_status_tracker`, `show_split_bill`, `show_smart_item_split`, `show_tip_tiers`).
6. `kiosk`: 6 узлов (`show_mini_qr`, `show_booking_btn`, `show_qr_bridge_btn`, `show_details_modal`, `allow_sound_in_modal`, `show_floor_plan`).
7. `kitchen_pacing`: 5 узлов (`enable_courses_system`, `enable_kitchen_pacing`, `enable_waiter_call_cooldown`, `cooldown_seconds`, `max_pacing_tables_per_slot`).
8. `kds`: 4 узла (`enable_kds_system`, `sound_alerts_enabled`, `notify_waiter_on_ready`, `alert_critical_delay_minutes`).

## БЛОК 3. ГОТОВЫЕ ФАЙЛЫ ДЛЯ КОММИТА (Full Production Code)
Предоставь полные, готовые к коммиту файлы:
1. `frontend/src/context/UIConfigContext.jsx` — провайдер с глубоким слиянием, поддержкой всех 8 секций и безопасными дефолтами.
2. `frontend/src/features/admin/UIConfigManager.jsx` — панель управления с Apple-style тумблерами, групповым включением/выключением ("Включить все" / "Выключить все") по каждой из 8 секций, инвалидацией SWR-кеша и сохранением в API.
3. `frontend/src/features/admin/DashboardLayout.jsx` — динамический роутинг и рендеринг вкладок админки с защитой от сокрытия вкладки настроек UI.
4. `frontend/src/features/mobile_menu/DishSlide.jsx` — 100% оборачивание всех визуальных узлов карточки и видеоплеера в проверки `card.show_* !== false`.
5. `frontend/src/features/mobile_menu/CartDrawer.jsx` — обертывание кнопок сплита, чаевых, экрана официанта, сервисного сбора и прямой отправки в `cart.show_* !== false`.