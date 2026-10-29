import os
from pydantic_settings import BaseSettings
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "Video Menu Luxury Platform"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    API_V1_STR: str = "/api/v1"
    
    # Database config (Postgres in Docker by default on port 5435 or standard 5432)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql+asyncpg://videomenu:videomenu@127.0.0.1:5435/videomenu"
    )
    SQLITE_FALLBACK_URL: str = f"sqlite+aiosqlite:///{BASE_DIR}/storage/videomenu.db"
    
    # Storage paths
    STORAGE_DIR: Path = BASE_DIR / "storage"
    VIDEOS_DIR: Path = BASE_DIR / "storage" / "videos"
    TMP_DIR: Path = BASE_DIR / "storage" / "tmp"
    
    # Transcoder settings
    MAX_VIDEO_SIZE_MB: int = 150
    DEFAULT_INACTIVITY_SECONDS: int = 45

    # Table Security and Anti-spoofing
    QR_SECRET_KEY: str = os.getenv("QR_SECRET_KEY", "video_menu_luxury_qr_secret_salt_9981")
    ENFORCE_TABLE_SIGNATURE: bool = os.getenv("ENFORCE_TABLE_SIGNATURE", "false").lower() in ("true", "1")

    class Config:
        env_file = ".env"
        extra = "allow"

DEFAULT_UI_CONFIG = {
    # 1. Шапка мобильного меню
    "header": {
        "show_brand_name": True,          # Название заведения
        "show_table_badge": True,         # Бейдж стола "📍 Стол №..."
        "show_change_table_btn": True,    # Возможность сменить стол вручную
        "show_language_picker": True,     # Выбор языка (RU/EN/TJ...)
        "show_categories_drawer": True,   # Кнопка "Разделы"
        "show_category_pills": True,      # Горизонтальные табы категорий
        "show_dietary_chips": True,       # Фильтры: "Хиты", "Шеф", "Острое"
        "show_table_booking_btn": True,   # Кнопка онлайн-бронирования стола в меню
    },
    # 2. Карточка блюда и Видео-лента Reels
    "dish_card": {
        "show_sound_toggle": True,        # Кнопка звука (динамик ASMR)
        "show_slide_counter": True,       # Счетчик "1/12" и полоска справа
        "show_badges": True,              # Бейджи "Шедевр Шефа", "Хит", "NEW"
        "show_price": True,               # Стоимость блюда
        "show_short_description": True,   # Краткое описание
        "show_sommelier_pairing": True,   # Винная пара / рекомендация сомелье
        "show_weight": True,              # Вес порции ("350 г")
        "show_calories": True,            # Калорийность ("580 ккал")
        "show_allergens": True,           # Предупреждение об аллергенах
        "show_ingredients": True,         # Развернутый состав блюда
        "show_serving_details": True,     # Особенности подачи от шефа
        "show_details_toggle": True,      # Кнопка "Подробнее / Скрыть"
        "show_add_to_cart_btn": True,     # Кнопка "В заказ / Настроить"
    },
    # 3. Нижняя сервисная планка вызова персонала
    "service_bar": {
        "show_service_bar": True,         # Вся нижняя планка целиком
        "show_call_waiter_btn": True,     # Кнопка "Официант"
        "show_request_bill_btn": True,    # Кнопка "Счёт"
        "show_cart_btn": True,            # Плавающая кнопка корзины "Заказ (X)"
        "show_quick_requests": True,      # Быстрые просьбы ("Лёд", "Приборы")
        "show_nps_rating": True,          # Оценка визита 1-5 звезд при запросе счета
        "show_comment_input": True,       # Поле своего комментария
        "allow_call_sommelier": True,     # Вызов сомелье (🍷)
        "allow_call_hookah": True,        # Вызов кальянщика (💨)
        "allow_call_admin": True,         # Вызов администратора / управляющего (👔)
    },
    # 4. Корзина и заказ
    "cart": {
        "wishlist_only_mode": False,      # Режим блокнота/витрины без прямой отправки
        "allow_self_ordering": True,      # Отправка заказа на кухню
        "show_service_charge": True,      # Строка "Обслуживание (10%)"
        "show_waiter_screen_btn": True,   # Кнопка "Показать экран официанту"
        "show_live_status_tracker": True, # Трекер "Принят -> Готовится"
        "show_split_bill": True,          # Калькулятор разделения счета (1-6 чел)
        "show_smart_item_split": True,    # Позиционный сплит-чек по персонам и блюдам
        "show_tip_tiers": True,           # Выбор чаевых (10%, 15%, 20%)
    },
    # 5. Уличный экран / Kiosk Mode
    "kiosk": {
        "show_mini_qr": True,             # QR-код на заставке
        "show_booking_btn": True,         # Кнопка "Забронировать стол"
        "show_qr_bridge_btn": True,       # Кнопка "Забрать меню на телефон"
        "show_details_modal": True,       # Детальное модальное окно блюда
        "allow_sound_in_modal": True,     # Звук в модальном окне
        "show_floor_plan": True,          # Интерактивная 2D-схема залов и столов
    },
    # 6. Вкладки панели управления (Admin Panel)
    "admin_tabs": {
        "show_dishes_tab": True,
        "show_reservations_tab": True,
        "show_service_requests_tab": True,
        "show_ui_config_tab": True,
        "show_categories_tab": True,
        "show_settings_tab": True,
        "show_theme_tab": True,
        "show_preview_tab": True,
    },
    # 7. Блок 1: Управление кухней и таймингами
    "kitchen_pacing": {
        "enable_courses_system": True,       # Выбор курсов подачи (Курс 1, 2, 3)
        "enable_kitchen_pacing": True,       # Лимит броней на 30 минут (защита кухни)
        "enable_waiter_call_cooldown": True, # Задержка 45 сек на повторный вызов официанта
        "cooldown_seconds": 45,              # Длительность задержки в секундах
        "max_pacing_tables_per_slot": 3,     # Максимум новых столов на один 30-мин слот
    },
    # 8. Модуль KDS: Кухонный планшет и диспетчер раздачи
    "kds": {
        "enable_kds_system": False,          # По умолчанию выключено (принцип нулевого риска)
        "sound_alerts_enabled": True,        # Звуковое оповещение при новом заказе
        "notify_waiter_on_ready": True,      # Пуш официанту, когда блюдо готово
        "alert_critical_delay_minutes": 18,  # Минут до красного тревожного мигания
    }
}

settings = Settings()

# Ensure directories exist
settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
settings.VIDEOS_DIR.mkdir(parents=True, exist_ok=True)
settings.TMP_DIR.mkdir(parents=True, exist_ok=True)
