# 🍽️ Премиальное Видеоменю & Интерактивная Витрина (Digital Smart Kiosk)

Высокопроизводительная платформа ресторанного видеоменю с разделением на 3 модуля:
1. **Мобильный клиент по QR-коду** (`/menu/:slug`) — вертикальная Reels-лента с мгновенной предзагрузкой и ASMR звуком.
2. **Уличный Kiosk-дисплей** (`/kiosk/:slug`) — интерактивная digital-витрина с рекламным Attract-видео, автосбросом по таймеру и QR-мостом для передачи меню на телефон прохожего.
3. **Панель управления (CMS)** (`/admin`) — 3-шаговая загрузка роликов, стоп-лист в 1 клик, drag&drop сортировка и редактор премиальных дизайн-тем.

---

## 🚀 Быстрый запуск

Вся система запускается **одной командой**:

```bash
bash run_dev.sh
```

Остановка всех процессов (порты 3033, 8088, 3000, 8000):
```bash
bash scripts/stop.sh
```

---

## 🌐 Ссылки на модули

- 📱 **Мобильное меню для гостей (Reels-формат):** [http://localhost:3033/menu/asr-royale](http://localhost:3033/menu/asr-royale)
- 🖥️ **Уличный экран (Kiosk / Attract Mode):** [http://localhost:3033/kiosk/asr-royale](http://localhost:3033/kiosk/asr-royale)
- ⚙️ **Админка ресторатора (Стоп-лист, Загрузка видео, Стили):** [http://localhost:3033/admin](http://localhost:3033/admin)
- 📖 **FastAPI Swagger Документация:** [http://localhost:8088/docs](http://localhost:8088/docs)

---

## 🏗️ Архитектура и структура проекта

```
video_menu/
├── backend/
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── router.py             # Сборщик v1 маршрутов
│   │   │   ├── restaurants.py        # /full-menu, темы оформления
│   │   │   ├── categories.py         # CRUD категорий и сортировка
│   │   │   ├── dishes.py             # CRUD блюд, стоп-лист, загрузка видео
│   │   │   ├── media.py              # Статус транскодирования
│   │   │   └── kiosk.py              # Настройки киоска и заставки
│   │   ├── core/
│   │   │   ├── config.py             # Конфигурация (.env)
│   │   │   ├── database.py           # Async SQLAlchemy (PostgreSQL в Docker + SQLite fallback)
│   │   │   └── security.py           # Токены безопасности
│   │   ├── models/                   # Модели Restaurant, Category, Dish, MediaAsset
│   │   ├── schemas/                  # Pydantic схемы валидации
│   │   ├── services/
│   │   │   ├── video_transcoder.py   # Конвейер FFmpeg (LQIP WebP + H.264 FastStart)
│   │   │   ├── storage_service.py    # Локальное хранение медиа без внешних сервисов
│   │   │   └── seed_data.py          # Автогенерация демо-меню с видеороликами
│   │   ├── workers/
│   │   │   └── video_tasks.py        # Фоновый воркер обработки медиа
│   │   └── main.py                   # FastAPI приложение, CORS и раздача статики
│   ├── storage/videos/               # Локальное хранилище MP4, WebM и WebP
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                   # GlassCard, GoldButton, LanguagePicker
│   │   │   └── video/                # VideoPlayer с LQIP-блюром и ASMR звуком
│   │   ├── features/
│   │   │   ├── mobile_menu/          # MobileFeed (Reels-скролл, плавающие табы)
│   │   │   ├── kiosk/                # KioskContainer (Attract, Interactive, QR-Bridge)
│   │   │   └── admin/                # DashboardLayout, DishFormModal, ThemeCustomizer
│   │   ├── context/                  # ThemeContext, LanguageContext
│   │   ├── hooks/                    # useInactivityTimer, useVideoPreload
│   │   ├── services/                 # api.js, menuService.js
│   │   ├── styles/                   # luxury-tokens.css, index.css
│   │   ├── App.jsx                   # Роутер (/menu/:slug, /kiosk/:slug, /admin)
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── scripts/
│   ├── start.sh                      # Очистка портов, проверка БД, локальный запуск
│   └── stop.sh                       # Остановка портов 3000 и 8000
└── README.md
```

---

## 💎 Ключевые возможности

1. **Локальное хранение медиа**: Никаких сторонних сервисов вроде S3 или платных CDN. Видео сохраняются на локальный диск (`backend/storage/videos/`) и раздаются через быстрый static mount FastAPI.
2. **Конвейер FFmpeg**:
   - Микро-превью LQIP WebP (320x568 ~10 КБ) для нулевой задержки при скролле.
   - Четкий постер HD WebP (1080x1920).
   - Мобильный вертикальный луп H.264 FastStart (720x1280 ~1 МБ, аудио вырезано для моментального стриминга).
   - Полноэкранный Kiosk Full HD луп (1080x1920).
3. **Уличный Kiosk Mode**:
   - При отсутствии касаний в течение 45 секунд включается рекламная Attract-заставка с видеороликом.
   - Первое касание плавно переводит экран в сенсорный каталог.
   - Полноэкранный QR-мост переносит выбранное меню на телефон прохожего.
   - Защита от контекстного меню и выделения текста.
4. **Стоп-лист в 1 тап**:
   - Моментальное скрытие позиции из мобильного меню и с уличного экрана.
5. **Мультиязычность**:
   - Поддержка Русского (RU), English (EN) и Тоҷикӣ (TJ).
6. **Динамический люкс-стиль**:
   - Палитра Dark Onyx + Imperial Gold, Glassmorphism с матовым блюром и шрифты Cormorant Garamond.
