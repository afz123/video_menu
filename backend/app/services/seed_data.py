import asyncio
import os
import subprocess
import logging
from sqlalchemy import select, text
from app.core.config import settings
from app.core.database import get_session, init_engine, Base
from app.models.restaurant import Restaurant
from app.models.category import Category
from app.models.dish import Dish
from app.models.media import MediaAsset
from app.models.service_request import ServiceRequest
from app.models.reservation import TableZone, DiningTable, TableReservation
from app.models.admin_user import AdminUser
from app.services.video_transcoder import get_ffmpeg_path

logger = logging.getLogger("video_menu.seeder")

# Хэш мастер-пароля вендора (по умолчанию от "admin123", заменяется на твой)
DEFAULT_SUPERADMIN_HASH = os.getenv(
    "SUPERADMIN_PASSWORD_HASH",
    "0123456789abcdef0123456789abcdef$81099d818b89c8bd6eb98a94698e053edfb59a092363020a6e25e790a33710d7"
)


def create_sample_video_clip(output_mp4: str, title: str, color_gradient: str, duration: int = 4):
    """
    Generates a beautiful simulated 9:16 vertical loop video using FFmpeg lavfi filters.
    """
    ffmpeg_bin = get_ffmpeg_path()
    if os.path.exists(output_mp4) and os.path.getsize(output_mp4) > 1000:
        return output_mp4

    cmd = [
        ffmpeg_bin, "-y",
        "-f", "lavfi", "-i", f"color=c={color_gradient}:s=720x1280:d={duration}:r=30",
        "-vf", "format=yuv420p,drawbox=y=ih-400:color=black@0.5:width=iw:height=400:t=fill",
        "-c:v", "libx264", "-profile:v", "high", "-preset", "fast",
        "-crf", "22", "-pix_fmt", "yuv420p", "-an",
        "-movflags", "+faststart",
        output_mp4
    ]

    try:
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    except Exception as e:
        logger.warning(f"Could not generate ffmpeg synthetic clip: {e}")
        subprocess.run([
            ffmpeg_bin, "-y", "-f", "lavfi", "-i", f"testsrc=duration={duration}:size=720x1280:rate=30",
            "-pix_fmt", "yuv420p", "-c:v", "libx264", "-an", "-movflags", "+faststart", output_mp4
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    return output_mp4

SAMPLE_MODIFIERS_STEAK = [
    {
        "id": "doneness",
        "name": "Степень прожарки",
        "type": "single",
        "required": True,
        "options": [
            {"name": "Rare (С кровью, 50-52°C)", "price": 0},
            {"name": "Medium Rare (Идеальная сочность, 54-57°C)", "price": 0},
            {"name": "Medium (Средняя прожарка, 60-63°C)", "price": 0},
            {"name": "Well Done (Полная прожарка, 70°C+)", "price": 0}
        ]
    },
    {
        "id": "sauce",
        "name": "Авторский соус",
        "type": "single",
        "required": False,
        "options": [
            {"name": "Черный трюфельный демиглас", "price": 35},
            {"name": "Сливочно-перечный соус с коньяком", "price": 25},
            {"name": "Розмариновое топленое масло", "price": 15}
        ]
    },
    {
        "id": "addons",
        "name": "Дополнения к стейку",
        "type": "multiple",
        "required": False,
        "options": [
            {"name": "Тигровая креветка на гриле (+1 шт)", "price": 60},
            {"name": "Свежий черный трюфель (5 г)", "price": 85},
            {"name": "Запеченный чеснок конфи", "price": 20}
        ]
    }
]

SAMPLE_MODIFIERS_LAMB = [
    {
        "id": "garnish",
        "name": "Выбор гарнира",
        "type": "single",
        "required": True,
        "options": [
            {"name": "Бархатное пюре из сельдерея", "price": 0},
            {"name": "Спаржа на гриле с пармезаном", "price": 45},
            {"name": "Мини-картофель конфи с тимьяном", "price": 30}
        ]
    }
]

async def ensure_superadmin_seeded(db):
    """Создание нестираемого аккаунта SuperAdmin в базе данных."""
    admin_res = await db.execute(select(AdminUser).where(AdminUser.role == "superadmin"))
    master_user = admin_res.scalars().first()
    if not master_user:
        master_user = AdminUser(
            username="superadmin",
            password_hash=DEFAULT_SUPERADMIN_HASH,
            role="superadmin",
            restaurant_id=None,
            is_active=True
        )
        db.add(master_user)
        await db.commit()
        logger.info("Master SuperAdmin account seeded into database successfully.")
    elif not master_user.password_hash:
        master_user.password_hash = DEFAULT_SUPERADMIN_HASH
        await db.commit()


async def ensure_reservation_tables_seeded(db, restaurant: Restaurant):
    """Creates multi-floor zones and tables (1st floor: Grand Hall & Terrace, 2nd floor: Lounge & VIP cabins)."""
    z_res = await db.execute(select(TableZone).where(TableZone.restaurant_id == restaurant.id).order_by(TableZone.display_order.asc()))
    existing_zones = z_res.scalars().all()

    if existing_zones:
        # 1. Update existing zones to multi-floor specification
        for z in existing_zones:
            name_lower = z.name.lower()
            if "террас" in name_lower:
                z.name = "Панорамная терраса"
                z.floor = 1
                z.display_order = 2
                z.image_url = "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1920&q=85"
            elif "лаунж" in name_lower or "атриум" in name_lower:
                z.name = "2-й этаж: Лаунж & Атриум"
                z.floor = 2
                z.display_order = 3
                z.image_url = "https://images.unsplash.com/photo-1578474846511-04ba529f0b88?auto=format&fit=crop&w=1920&q=85"
            elif "vip" in name_lower:
                z.name = "2-й этаж: Приватные VIP-кабины"
                z.floor = 2
                z.display_order = 4
                z.image_url = "https://images.unsplash.com/photo-1578474846511-04ba529f0b88?auto=format&fit=crop&w=1920&q=85"
            else:
                z.name = "Основной зал (Grand Hall)"
                z.floor = 1
                z.display_order = 1
                z.image_url = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1920&q=85"

        # 2. If 2nd Floor Lounge is missing, create it
        lounge_zone = next((z for z in existing_zones if "лаунж" in z.name.lower() or "атриум" in z.name.lower()), None)
        if not lounge_zone:
            lounge_zone = TableZone(
                restaurant_id=restaurant.id,
                name="2-й этаж: Лаунж & Атриум",
                description="Панорамный балкон с видом на рояль, мягкие диваны и винный погреб",
                image_url="https://images.unsplash.com/photo-1578474846511-04ba529f0b88?auto=format&fit=crop&w=1920&q=85",
                floor=2,
                display_order=3,
                is_active=True
            )
            db.add(lounge_zone)
            await db.flush()

        # Check and add tables for Lounge if missing
        lounge_tbls_res = await db.execute(select(DiningTable).where(DiningTable.zone_id == lounge_zone.id))
        lounge_tbl_numbers = [t.table_number for t in lounge_tbls_res.scalars().all()]
        new_lounge_tables = []
        if "201" not in lounge_tbl_numbers:
            new_lounge_tables.append(DiningTable(
                restaurant_id=restaurant.id, zone_id=lounge_zone.id, table_number="201",
                min_capacity=2, max_capacity=4, pos_x=26.0, pos_y=65.0, shape="square",
                photo_url="https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=800&q=80",
                features=["Вид на атриум", "Мягкие кресла"]
            ))
        if "202" not in lounge_tbl_numbers:
            new_lounge_tables.append(DiningTable(
                restaurant_id=restaurant.id, zone_id=lounge_zone.id, table_number="202",
                min_capacity=2, max_capacity=4, pos_x=48.0, pos_y=68.0, shape="square",
                photo_url="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
                features=["Панорама зала", "У камина"]
            ))
        if "203" not in lounge_tbl_numbers:
            new_lounge_tables.append(DiningTable(
                restaurant_id=restaurant.id, zone_id=lounge_zone.id, table_number="203",
                min_capacity=2, max_capacity=4, pos_x=72.0, pos_y=64.0, shape="square",
                photo_url="https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80",
                features=["Тихая зона", "Свечи"]
            ))
        if "204" not in lounge_tbl_numbers:
            new_lounge_tables.append(DiningTable(
                restaurant_id=restaurant.id, zone_id=lounge_zone.id, table_number="204",
                min_capacity=4, max_capacity=8, pos_x=50.0, pos_y=30.0, shape="rectangle",
                photo_url="https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=800&q=80",
                features=["Большой лаунж", "Вид на рояль"]
            ))
        if new_lounge_tables:
            db.add_all(new_lounge_tables)

        # Ensure VIP cabins have shape="cabin"
        vip_zone = next((z for z in existing_zones if "vip" in z.name.lower()), None)
        if vip_zone:
            vip_tbls_res = await db.execute(select(DiningTable).where(DiningTable.zone_id == vip_zone.id))
            for vt in vip_tbls_res.scalars().all():
                vt.shape = "cabin"

        await db.commit()
        logger.info("Multi-floor zones and tables synchronized for %s", restaurant.name)
        return

    # Fresh seeding: 4 zones across 2 floors
    main_hall = TableZone(
        restaurant_id=restaurant.id,
        name="Основной зал (Grand Hall)",
        description="Элегантная атмосфера, живой рояль и панорамный камин",
        image_url="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1920&q=85",
        floor=1,
        display_order=1,
        is_active=True
    )
    terrace = TableZone(
        restaurant_id=restaurant.id,
        name="Панорамная терраса",
        description="Открытый вид на вечерний город с подогревом и пледами",
        image_url="https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1920&q=85",
        floor=1,
        display_order=2,
        is_active=True
    )
    lounge = TableZone(
        restaurant_id=restaurant.id,
        name="2-й этаж: Лаунж & Атриум",
        description="Панорамный балкон с видом на рояль, мягкие диваны и винный погреб",
        image_url="https://images.unsplash.com/photo-1578474846511-04ba529f0b88?auto=format&fit=crop&w=1920&q=85",
        floor=2,
        display_order=3,
        is_active=True
    )
    vip_cabins = TableZone(
        restaurant_id=restaurant.id,
        name="2-й этаж: Приватные VIP-кабины",
        description="Приватные звукоизолированные кабинеты для закрытых ужинов",
        image_url="https://images.unsplash.com/photo-1578474846511-04ba529f0b88?auto=format&fit=crop&w=1920&q=85",
        floor=2,
        display_order=4,
        is_active=True
    )
    db.add_all([main_hall, terrace, lounge, vip_cabins])
    await db.flush()

    tables = [
        # 1-й этаж: Основной зал (Grand Hall) — столы №1–№6
        DiningTable(
            restaurant_id=restaurant.id, zone_id=main_hall.id, table_number="1",
            min_capacity=1, max_capacity=2, pos_x=22.0, pos_y=72.0, shape="round",
            photo_url="https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=800&q=80",
            features=["У окна", "При свечах"]
        ),
        DiningTable(
            restaurant_id=restaurant.id, zone_id=main_hall.id, table_number="2",
            min_capacity=1, max_capacity=2, pos_x=38.0, pos_y=76.0, shape="round",
            photo_url="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
            features=["Уютный столик", "Свечи"]
        ),
        DiningTable(
            restaurant_id=restaurant.id, zone_id=main_hall.id, table_number="3",
            min_capacity=1, max_capacity=2, pos_x=54.0, pos_y=74.0, shape="round",
            photo_url="https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80",
            features=["Центр зала", "У камина"]
        ),
        DiningTable(
            restaurant_id=restaurant.id, zone_id=main_hall.id, table_number="4",
            min_capacity=2, max_capacity=4, pos_x=24.0, pos_y=48.0, shape="square",
            photo_url="https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=800&q=80",
            features=["Мягкие диваны", "У окна"]
        ),
        DiningTable(
            restaurant_id=restaurant.id, zone_id=main_hall.id, table_number="5",
            min_capacity=2, max_capacity=4, pos_x=52.0, pos_y=50.0, shape="square",
            photo_url="https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=800&q=80",
            features=["Рядом с роялем", "Диваны"]
        ),
        DiningTable(
            restaurant_id=restaurant.id, zone_id=main_hall.id, table_number="6",
            min_capacity=2, max_capacity=4, pos_x=76.0, pos_y=52.0, shape="square",
            photo_url="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
            features=["Барная линия", "Быстрая подача"]
        ),

        # 1-й этаж: Панорамная терраса — столы T-1–T-4
        DiningTable(
            restaurant_id=restaurant.id, zone_id=terrace.id, table_number="T-1",
            min_capacity=1, max_capacity=2, pos_x=25.0, pos_y=68.0, shape="round",
            photo_url="https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80",
            features=["Панорама заката", "Обогрев и плед"]
        ),
        DiningTable(
            restaurant_id=restaurant.id, zone_id=terrace.id, table_number="T-2",
            min_capacity=2, max_capacity=4, pos_x=48.0, pos_y=64.0, shape="square",
            photo_url="https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80",
            features=["Первая линия", "Свежий воздух"]
        ),
        DiningTable(
            restaurant_id=restaurant.id, zone_id=terrace.id, table_number="T-3",
            min_capacity=2, max_capacity=4, pos_x=74.0, pos_y=62.0, shape="square",
            photo_url="https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80",
            features=["Уютный уголок", "Теплый свет"]
        ),
        DiningTable(
            restaurant_id=restaurant.id, zone_id=terrace.id, table_number="T-4",
            min_capacity=4, max_capacity=8, pos_x=52.0, pos_y=32.0, shape="rectangle",
            photo_url="https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80",
            features=["Лаунж-диваны", "Широкий обзор"]
        ),

        # 2-й этаж: Лаунж & Атриум — столы 201–204
        DiningTable(
            restaurant_id=restaurant.id, zone_id=lounge.id, table_number="201",
            min_capacity=2, max_capacity=4, pos_x=26.0, pos_y=65.0, shape="square",
            photo_url="https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=800&q=80",
            features=["Вид на атриум", "Мягкие кресла"]
        ),
        DiningTable(
            restaurant_id=restaurant.id, zone_id=lounge.id, table_number="202",
            min_capacity=2, max_capacity=4, pos_x=48.0, pos_y=68.0, shape="square",
            photo_url="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
            features=["Панорама зала", "У камина"]
        ),
        DiningTable(
            restaurant_id=restaurant.id, zone_id=lounge.id, table_number="203",
            min_capacity=2, max_capacity=4, pos_x=72.0, pos_y=64.0, shape="square",
            photo_url="https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80",
            features=["Тихая зона", "Свечи"]
        ),
        DiningTable(
            restaurant_id=restaurant.id, zone_id=lounge.id, table_number="204",
            min_capacity=4, max_capacity=8, pos_x=50.0, pos_y=30.0, shape="rectangle",
            photo_url="https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=800&q=80",
            features=["Большой лаунж", "Вид на рояль"]
        ),

        # 2-й этаж: Приватные VIP-кабины — VIP-1 и VIP-2
        DiningTable(
            restaurant_id=restaurant.id, zone_id=vip_cabins.id, table_number="VIP-1",
            min_capacity=4, max_capacity=10, pos_x=34.0, pos_y=56.0, shape="cabin",
            photo_url="https://images.unsplash.com/photo-1578474846511-04ba529f0b88?auto=format&fit=crop&w=800&q=80",
            features=["Полная приватность", "Камин", "Личный официант"]
        ),
        DiningTable(
            restaurant_id=restaurant.id, zone_id=vip_cabins.id, table_number="VIP-2",
            min_capacity=6, max_capacity=16, pos_x=68.0, pos_y=52.0, shape="cabin",
            photo_url="https://images.unsplash.com/photo-1578474846511-04ba529f0b88?auto=format&fit=crop&w=800&q=80",
            features=["Президентский стол", "Аудиосистема", "VIP-гардероб"]
        ),
    ]
    db.add_all(tables)
    await db.commit()
    logger.info("Default zones and dining tables seeded successfully for %s", restaurant.name)

async def seed_database():

    engine = await init_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
        # Schema migration helper for PostgreSQL and SQLite
        is_postgres = "postgres" in str(engine.url)
        if is_postgres:
            stmts = [
                "ALTER TABLE dishes ADD COLUMN IF NOT EXISTS badges JSON DEFAULT '[]'::json;",
                "ALTER TABLE dishes ADD COLUMN IF NOT EXISTS modifiers JSON DEFAULT '[]'::json;",
                "ALTER TABLE dishes ADD COLUMN IF NOT EXISTS pairings JSON DEFAULT '[]'::json;",
                "ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS currency VARCHAR(8) DEFAULT 'TJS';",
                "ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS call_types_enabled JSON DEFAULT '[\"waiter\", \"bill\", \"sommelier\", \"hookah\", \"admin\"]'::json;",
                "ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS old_slugs JSON DEFAULT '[]'::json;",
                "ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS service_charge_percent FLOAT DEFAULT 10.0;",
                "ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS telegram_bot_token VARCHAR(128);",
                "ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(64);",
                "ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS telegram_enabled BOOLEAN DEFAULT FALSE;",
                "ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS admin_password_hash VARCHAR(256);",
                "ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS enabled_modules JSON DEFAULT '[\"menu\", \"ordering\", \"service_dispatch\", \"guest_finance\", \"reservations\", \"kiosk\", \"kds\"]'::json;",
                "ALTER TABLE categories ADD COLUMN IF NOT EXISTS schedule_start VARCHAR(8);",
                "ALTER TABLE categories ADD COLUMN IF NOT EXISTS schedule_end VARCHAR(8);",
                "ALTER TABLE categories ADD COLUMN IF NOT EXISTS daypart VARCHAR(32) DEFAULT 'all';",
                "ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS guest_session_id VARCHAR(64);",
                "ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS table_signature VARCHAR(64);",
                "ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS subtotal_amount FLOAT DEFAULT 0.0;",
                "ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS service_charge_amount FLOAT DEFAULT 0.0;",
                "ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS total_amount FLOAT DEFAULT 0.0;",
                "ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS currency VARCHAR(8) DEFAULT 'TJS';",
                "ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS nps_score INTEGER;",
                "ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS acknowledged_by VARCHAR(64);",
                "ALTER TABLE table_zones ADD COLUMN IF NOT EXISTS image_url VARCHAR(512);",
                "ALTER TABLE table_zones ADD COLUMN IF NOT EXISTS floor INTEGER DEFAULT 1;",
                "ALTER TABLE dining_tables ADD COLUMN IF NOT EXISTS photo_url VARCHAR(512);",
                "ALTER TABLE dining_tables ADD COLUMN IF NOT EXISTS features JSON DEFAULT '[]'::json;",
                "ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS permissions JSON DEFAULT '[\"view_menu\", \"toggle_stop_list\", \"resolve_requests\"]'::json;"
            ]
            for stmt in stmts:
                try:
                    await conn.execute(text(stmt))
                except Exception as e:
                    logger.debug(f"Migration note: {e}")

            # Обновление существующих данных для фото-карты, если пустые
            try:
                await conn.execute(text("UPDATE table_zones SET image_url = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1920&q=85' WHERE name = 'Основной зал' AND (image_url IS NULL OR image_url = '');"))
                await conn.execute(text("UPDATE table_zones SET image_url = 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1920&q=85' WHERE name = 'Панорамная терраса' AND (image_url IS NULL OR image_url = '');"))
                await conn.execute(text("UPDATE table_zones SET image_url = 'https://images.unsplash.com/photo-1578474846511-04ba529f0b88?auto=format&fit=crop&w=1920&q=85' WHERE name = 'VIP-комната' AND (image_url IS NULL OR image_url = '');"))
                
                # Нормализация координат в проценты для столов и заполнение фото и фич
                await conn.execute(text("UPDATE dining_tables SET pos_x = 22.0, pos_y = 72.0, photo_url = 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=800&q=80', features = '[\"У окна\", \"При свечах\"]'::json WHERE table_number = '1' AND (pos_y > 100 OR photo_url IS NULL);"))
                await conn.execute(text("UPDATE dining_tables SET pos_x = 38.0, pos_y = 76.0, photo_url = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80', features = '[\"Уютный столик\", \"Свечи\"]'::json WHERE table_number = '2' AND (pos_y > 100 OR photo_url IS NULL);"))
                await conn.execute(text("UPDATE dining_tables SET pos_x = 54.0, pos_y = 74.0, photo_url = 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80', features = '[\"Центр зала\", \"У камина\"]'::json WHERE table_number = '3' AND (pos_y > 100 OR photo_url IS NULL);"))
                await conn.execute(text("UPDATE dining_tables SET pos_x = 24.0, pos_y = 48.0, photo_url = 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=800&q=80', features = '[\"Мягкие диваны\", \"У окна\"]'::json WHERE table_number = '4' AND (pos_y > 100 OR photo_url IS NULL);"))
                await conn.execute(text("UPDATE dining_tables SET pos_x = 52.0, pos_y = 50.0, photo_url = 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=800&q=80', features = '[\"Рядом с роялем\", \"Диваны\"]'::json WHERE table_number = '5' AND (pos_y > 100 OR photo_url IS NULL);"))
                await conn.execute(text("UPDATE dining_tables SET pos_x = 76.0, pos_y = 52.0, photo_url = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80', features = '[\"Барная линия\", \"Быстрая подача\"]'::json WHERE table_number = '6' AND (pos_y > 100 OR photo_url IS NULL);"))
                await conn.execute(text("UPDATE dining_tables SET pos_x = 28.0, pos_y = 28.0, photo_url = 'https://images.unsplash.com/photo-1578474846511-04ba529f0b88?auto=format&fit=crop&w=800&q=80', features = '[\"Для компании\", \"Кожаные диваны\"]'::json WHERE table_number = '7' AND (pos_y > 100 OR photo_url IS NULL);"))
                await conn.execute(text("UPDATE dining_tables SET pos_x = 66.0, pos_y = 26.0, photo_url = 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80', features = '[\"Панорамный обзор\", \"Тихий сектор\"]'::json WHERE table_number = '8' AND (pos_y > 100 OR photo_url IS NULL);"))
                await conn.execute(text("UPDATE dining_tables SET pos_x = 84.0, pos_y = 72.0, photo_url = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80', features = '[\"Банкетная зона\", \"Большой диван\"]'::json WHERE table_number = '9' AND (pos_y > 100 OR photo_url IS NULL);"))
                await conn.execute(text("UPDATE dining_tables SET pos_x = 25.0, pos_y = 68.0, photo_url = 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80', features = '[\"Панорама заката\", \"Обогрев и плед\"]'::json WHERE table_number = 'T-1' AND (pos_y > 100 OR photo_url IS NULL);"))
                await conn.execute(text("UPDATE dining_tables SET pos_x = 48.0, pos_y = 64.0, photo_url = 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80', features = '[\"Первая линия\", \"Свежий воздух\"]'::json WHERE table_number = 'T-2' AND (pos_y > 100 OR photo_url IS NULL);"))
                await conn.execute(text("UPDATE dining_tables SET pos_x = 74.0, pos_y = 62.0, photo_url = 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80', features = '[\"Уютный уголок\", \"Теплый свет\"]'::json WHERE table_number = 'T-3' AND (pos_y > 100 OR photo_url IS NULL);"))
                await conn.execute(text("UPDATE dining_tables SET pos_x = 52.0, pos_y = 32.0, photo_url = 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80', features = '[\"Лаунж-диваны\", \"Широкий обзор\"]'::json WHERE table_number = 'T-4' AND (pos_y > 100 OR photo_url IS NULL);"))
                await conn.execute(text("UPDATE dining_tables SET pos_x = 34.0, pos_y = 56.0, photo_url = 'https://images.unsplash.com/photo-1578474846511-04ba529f0b88?auto=format&fit=crop&w=800&q=80', features = '[\"Полная приватность\", \"Камин\", \"Личный официант\"]'::json WHERE table_number = 'VIP-1' AND (pos_y > 100 OR photo_url IS NULL);"))
                await conn.execute(text("UPDATE dining_tables SET pos_x = 68.0, pos_y = 52.0, photo_url = 'https://images.unsplash.com/photo-1578474846511-04ba529f0b88?auto=format&fit=crop&w=800&q=80', features = '[\"Президентский стол\", \"Аудиосистема\", \"VIP-гардероб\"]'::json WHERE table_number = 'VIP-2' AND (pos_y > 100 OR photo_url IS NULL);"))
            except Exception as e:
                logger.debug(f"Data migration note: {e}")
        else:
            # SQLite fallback migrations
            try:
                await conn.execute(text("ALTER TABLE table_zones ADD COLUMN image_url VARCHAR(512);"))
            except Exception: pass
            try:
                await conn.execute(text("ALTER TABLE admin_users ADD COLUMN permissions JSON DEFAULT '[\"view_menu\", \"toggle_stop_list\", \"resolve_requests\"]';"))
            except Exception: pass
            try:
                await conn.execute(text("ALTER TABLE table_zones ADD COLUMN floor INTEGER DEFAULT 1;"))
            except Exception: pass
            try:
                await conn.execute(text("ALTER TABLE dining_tables ADD COLUMN photo_url VARCHAR(512);"))
            except Exception: pass
            try:
                await conn.execute(text("ALTER TABLE dining_tables ADD COLUMN features JSON DEFAULT '[]';"))
            except Exception: pass
            try:
                await conn.execute(text("ALTER TABLE restaurants ADD COLUMN currency VARCHAR(8) DEFAULT 'TJS';"))
            except Exception: pass
            try:
                await conn.execute(text("ALTER TABLE restaurants ADD COLUMN admin_password_hash VARCHAR(256);"))
            except Exception: pass
            try:
                await conn.execute(text("ALTER TABLE restaurants ADD COLUMN call_types_enabled JSON DEFAULT '[\"waiter\", \"bill\", \"sommelier\", \"hookah\", \"admin\"]';"))
            except Exception: pass
            try:
                await conn.execute(text("ALTER TABLE dishes ADD COLUMN badges JSON DEFAULT '[]';"))
            except Exception: pass
            try:
                await conn.execute(text("ALTER TABLE dishes ADD COLUMN modifiers JSON DEFAULT '[]';"))
            except Exception: pass
            try:
                await conn.execute(text("ALTER TABLE dishes ADD COLUMN pairings JSON DEFAULT '[]';"))
            except Exception: pass
            try:
                await conn.execute(text("ALTER TABLE restaurants ADD COLUMN old_slugs JSON DEFAULT '[]';"))
            except Exception: pass
            try:
                await conn.execute(text("ALTER TABLE restaurants ADD COLUMN service_charge_percent FLOAT DEFAULT 10.0;"))
            except Exception: pass
            try:
                await conn.execute(text("ALTER TABLE restaurants ADD COLUMN telegram_bot_token VARCHAR(128);"))
            except Exception: pass
            try:
                await conn.execute(text("ALTER TABLE restaurants ADD COLUMN telegram_chat_id VARCHAR(64);"))
            except Exception: pass
            try:
                await conn.execute(text("ALTER TABLE restaurants ADD COLUMN telegram_enabled BOOLEAN DEFAULT 0;"))
            except Exception: pass
            try:
                await conn.execute(text("ALTER TABLE service_requests ADD COLUMN guest_session_id VARCHAR(64);"))
            except Exception: pass
            try:
                await conn.execute(text("ALTER TABLE service_requests ADD COLUMN table_signature VARCHAR(64);"))
            except Exception: pass
            try:
                await conn.execute(text("ALTER TABLE service_requests ADD COLUMN subtotal_amount FLOAT DEFAULT 0.0;"))
            except Exception: pass
            try:
                await conn.execute(text("ALTER TABLE service_requests ADD COLUMN service_charge_amount FLOAT DEFAULT 0.0;"))
            except Exception: pass
            try:
                await conn.execute(text("ALTER TABLE service_requests ADD COLUMN total_amount FLOAT DEFAULT 0.0;"))
            except Exception: pass
            try:
                await conn.execute(text("ALTER TABLE service_requests ADD COLUMN currency VARCHAR(8) DEFAULT 'TJS';"))
            except Exception: pass
            try:
                await conn.execute(text("ALTER TABLE service_requests ADD COLUMN nps_score INTEGER;"))
            except Exception: pass
            try:
                await conn.execute(text("ALTER TABLE service_requests ADD COLUMN acknowledged_by VARCHAR(64);"))
            except Exception: pass
            try:
                await conn.execute(text("ALTER TABLE categories ADD COLUMN schedule_start VARCHAR(8);"))
            except Exception: pass
            try:
                await conn.execute(text("ALTER TABLE categories ADD COLUMN schedule_end VARCHAR(8);"))
            except Exception: pass
            try:
                await conn.execute(text("ALTER TABLE categories ADD COLUMN daypart VARCHAR(32) DEFAULT 'all';"))
            except Exception: pass
            try:
                await conn.execute(text("ALTER TABLE table_zones ADD COLUMN floor INTEGER DEFAULT 1;"))
            except Exception: pass
            try:
                await conn.execute(text("ALTER TABLE table_zones ADD COLUMN image_url VARCHAR(512);"))
            except Exception: pass
            try:
                await conn.execute(text("ALTER TABLE admin_users ADD COLUMN permissions JSON DEFAULT '[\"view_menu\", \"toggle_stop_list\", \"resolve_requests\"]';"))
            except Exception: pass
            try:
                await conn.execute(text("ALTER TABLE dining_tables ADD COLUMN photo_url VARCHAR(512);"))
            except Exception: pass
            try:
                await conn.execute(text("ALTER TABLE dining_tables ADD COLUMN features JSON;"))
            except Exception: pass
            try:
                await conn.execute(text("ALTER TABLE restaurants ADD COLUMN enabled_modules JSON;"))
            except Exception: pass

    session = await get_session()
    async with session as db:
        # Check if restaurant exists
        res = await db.execute(select(Restaurant).where(Restaurant.slug == "asr-royale"))
        existing_rest = res.scalar_one_or_none()
        
        if existing_rest:
            logger.info("Database already seeded with asr-royale. Checking dish modifiers & badges...")
            if existing_rest.enabled_modules is None:
                existing_rest.enabled_modules = [
                    "menu", "ordering", "service_dispatch", "guest_finance", "reservations", "kiosk", "kds"
                ]
                await db.commit()
            # Ensure existing dishes have sample modifiers if empty
            dishes_res = await db.execute(select(Dish).where(Dish.restaurant_id == existing_rest.id))
            all_dishes = dishes_res.scalars().all()
            updated = False
            for d in all_dishes:
                name_ru = (d.name_translations or {}).get("ru", "")
                if not d.modifiers:
                    if "Томагавк" in name_ru or "Филе-миньон" in name_ru:
                        d.modifiers = SAMPLE_MODIFIERS_STEAK
                        updated = True
                    elif "ягненка" in name_ru:
                        d.modifiers = SAMPLE_MODIFIERS_LAMB
                        updated = True
                if not d.badges:
                    if "Томагавк" in name_ru:
                        d.badges = ["Хит", "Выбор Шефа"]
                        updated = True
                    elif "Филе-миньон" in name_ru:
                        d.badges = ["Выбор Шефа", "Премиум"]
                        updated = True
                    elif "Тартар" in name_ru:
                        d.badges = ["NEW", "Острое 🌶️"]
                        updated = True
                    elif "сфера" in name_ru:
                        d.badges = ["Хит", "Десерт от Шефа"]
                        updated = True
                if not d.pairings:
                    if "Томагавк" in name_ru or "Филе-миньон" in name_ru:
                        d.pairings = [{"text": "Идеально сочетается с: Бокал Malbec Grand Reserve (120 TJS)"}]
                        updated = True
                    elif "Тартар" in name_ru:
                        d.pairings = [{"text": "Рекомендация: Royale Smoked Old Fashioned (170 TJS)"}]
                        updated = True
            if updated:
                await db.commit()
                logger.info("Enriched existing dishes with modifiers, badges, and pairings.")
            await ensure_superadmin_seeded(db)
            await ensure_reservation_tables_seeded(db, existing_rest)
            return

        logger.info("Seeding database with demo luxury restaurant...")

        # Create demo restaurant
        restaurant = Restaurant(
            name="ASR Maison Royale",
            slug="asr-royale",
            old_slugs=[],
            tagline="Haute Cuisine & Dry-Aged Steaks",
            description="Флагманский гастрономический ресторан премиум-класса с авторской кухней шеф-повара и собственной камерой сухого вызревания мяса.",
            supported_locales=["ru", "en", "tj"],
            default_locale="ru",
            enabled_modules=["menu", "ordering", "service_dispatch", "guest_finance", "reservations", "kiosk", "kds"],
            theme_config={
                "theme_id": "luxury_dark_gold",
                "colors": {
                    "background": "#08080a",
                    "surface": "rgba(18, 18, 24, 0.75)",
                    "primary_accent": "#d4af37",
                    "secondary_accent": "#f3ba2f",
                    "text_primary": "#f8fafc",
                    "text_secondary": "#94a3b8",
                    "border_glow": "rgba(212, 175, 55, 0.3)"
                },
                "typography": {
                    "font_title": "'Cormorant Garamond', Georgia, serif",
                    "font_body": "'Plus Jakarta Sans', sans-serif"
                },
                "kiosk_settings": {
                    "inactivity_seconds": 45,
                    "attract_video_url": "/static/videos/attract_royale_kiosk.mp4",
                    "headline": "ASR Maison Royale",
                    "subheadline": "Прикоснитесь к экрану, чтобы открыть видеоменю",
                    "show_qr_overlay": True
                }
            }
        )
        db.add(restaurant)
        await db.flush()

        # Generate sample attract video
        attract_video_file = str(settings.VIDEOS_DIR / "attract_royale_kiosk.mp4")
        create_sample_video_clip(attract_video_file, "Attract Promo", "0x161208", duration=5)

        # 4 Categories with dayparting
        categories_data = [
            {
                "name": {"ru": "Фирменные стейки", "en": "Signature Steaks", "tj": "Стейкҳои хусусӣ"},
                "icon": "flame",
                "order": 1,
                "schedule_start": "12:00",
                "schedule_end": "23:59",
                "daypart": "main"
            },
            {
                "name": {"ru": "Холодные закуски & Raw Bar", "en": "Cold Appetizers & Raw Bar", "tj": "Газакҳои сард"},
                "icon": "sparkles",
                "order": 2,
                "schedule_start": "11:00",
                "schedule_end": "23:59",
                "daypart": "main"
            },
            {
                "name": {"ru": "Десерты от шефа", "en": "Chef's Desserts", "tj": "Шириниҳои сарошпаз"},
                "icon": "cake",
                "order": 3,
                "schedule_start": "10:00",
                "schedule_end": "23:59",
                "daypart": "all"
            },
            {
                "name": {"ru": "Авторский бар", "en": "Craft Bar", "tj": "Бари муаллифӣ"},
                "icon": "wine",
                "order": 4,
                "schedule_start": "16:00",
                "schedule_end": "03:00",
                "daypart": "bar"
            }
        ]

        created_categories = []
        for cdata in categories_data:
            cat = Category(
                restaurant_id=restaurant.id,
                name_translations=cdata["name"],
                icon=cdata["icon"],
                display_order=cdata["order"],
                schedule_start=cdata.get("schedule_start"),
                schedule_end=cdata.get("schedule_end"),
                daypart=cdata.get("daypart", "all")
            )
            db.add(cat)
            created_categories.append(cat)
        await db.flush()

        # Dishes data: (cat_id, name, desc, weight, cals, allergens, badges, modifiers, pairings, price, currency, color)
        dishes_raw = [
            # Steaks
            (
                created_categories[0].id,
                {"ru": "Томагавк Dry-Aged 45 дней", "en": "Tomahawk Dry-Aged 45 Days", "tj": "Томагавк 45-рӯзаи хушкшуда"},
                {"ru": "Премиальный рибай на кости сухого вызревания с розмариновым маслом, печеным чесноком и черным трюфелем.",
                 "en": "Prime bone-in ribeye with rosemary herb butter, roasted black garlic and shaved winter truffle.",
                 "tj": "Рибайи олиҷаноб бо равғани розмарин ва сири сиёҳи пухта."},
                "1100 г", "980 ккал", ["лактоза"],
                ["Хит", "Выбор Шефа"],
                SAMPLE_MODIFIERS_STEAK,
                [{"text": "Идеально сочетается с: Бокал Malbec Grand Reserve (120 TJS)"}],
                890.0, "TJS", "0x2e1208"
            ),
            (
                created_categories[0].id,
                {"ru": "Филе-миньон Prime с фуа-гра", "en": "Prime Filet Mignon & Foie Gras", "tj": "Филе-минйон Prime бо фуа-гра"},
                {"ru": "Нежнейшая мраморная вырезка зернового откорма, эскалоп из утиной фуа-гра и демиглас на портвейне.",
                 "en": "Tender grain-fed tenderloin medallion, seared duck foie gras escalope and ruby port reduction.",
                 "tj": "Гӯшти нарм бо фуа-гра ва чошнии махсуси демиглас."},
                "340 г", "620 ккал", ["лактоза"],
                ["Выбор Шефа", "Премиум"],
                SAMPLE_MODIFIERS_STEAK,
                [{"text": "Идеально сочетается с: Бокал Malbec Grand Reserve (120 TJS)"}],
                450.0, "TJS", "0x2b1509"
            ),
            (
                created_categories[0].id,
                {"ru": "Каре новозеландского ягненка", "en": "New Zealand Lamb Rack", "tj": "Гӯшти барраи Зеландияи Нав"},
                {"ru": "Королевское каре в фисташковой панировке с пюре из печеного сельдерея и можжевеловым соусом.",
                 "en": "Crusted pistachio herb rack with velvety celeriac puree and mountain juniper glaze.",
                 "tj": "Караи барра бо писта ва пюреи махсус."},
                "420 г", "580 ккал", ["орехи", "лактоза"],
                ["Премиум"],
                SAMPLE_MODIFIERS_LAMB,
                [{"text": "Рекомендация сомелье: Shiraz Reserve (140 TJS)"}],
                380.0, "TJS", "0x201309"
            ),

            # Appetizers
            (
                created_categories[1].id,
                {"ru": "Тартар из мраморной говядины", "en": "Prime Wagyu Tartare", "tj": "Тартар аз гӯшти мармарӣ"},
                {"ru": "Тонко нарезанная вырезка Black Angus с трюфельным айоли, каперсами и чипсом из льна.",
                 "en": "Hand-cut Black Angus with black truffle aioli, salted capers, quail yolk and flaxseed crisp.",
                 "tj": "Тартари хушсифат бо айолии трюфел ва зардии тухми бедона."},
                "210 г", "340 ккал", ["яйца"],
                ["NEW", "Острое 🌶️"],
                [],
                [{"text": "Рекомендация: Royale Smoked Old Fashioned (170 TJS)"}],
                210.0, "TJS", "0x161a0a"
            ),
            (
                created_categories[1].id,
                {"ru": "Карпаччо из дикого гребешка", "en": "Wild Sea Scallop Carpaccio", "tj": "Карпаччо аз гребешоки баҳрӣ"},
                {"ru": "Сахалинский гребешок, цитрусовый юдзу-дрессинг, слайсы черного трюфеля и микрозелень.",
                 "en": "Thinly shaved sea scallops, yuzu citrus ponzu, black winter truffle pearls and purple shiso.",
                 "tj": "Гребешоки баҳрӣ бо соуси ситрусии юдзу ва трюфел."},
                "180 г", "210 ккал", ["морепродукты"],
                ["Raw Bar"],
                [],
                [{"text": "Рекомендация: Шабли Premier Cru (160 TJS)"}],
                260.0, "TJS", "0x0d1f1c"
            ),

            # Desserts
            (
                created_categories[2].id,
                {"ru": "Золотая сфера Grand Cru", "en": "Grand Cru Golden Sphere", "tj": "Кураи тиллоии Grand Cru"},
                {"ru": "Шоколадный ганаш Valrhona 70%, жидкая сердцевина из маракуйи и съедобное сусальное золото 24K.",
                 "en": "Dark Valrhona 70% chocolate dome, passion fruit melting core and 24K edible gold leaves.",
                 "tj": "Шоколади сиёҳи фаронсавӣ бо дили маракуйя ва тиллои 24K."},
                "190 г", "440 ккал", ["лактоза"],
                ["Хит", "Десерт от Шефа"],
                [],
                [{"text": "Идеально с: Эспрессо со взбитыми сливками (35 TJS)"}],
                180.0, "TJS", "0x2a1a06"
            ),
            (
                created_categories[2].id,
                {"ru": "Баскский чизкейк с ванилью Мадагаскар", "en": "Madagascan Basque Cheesecake", "tj": "Чизкейки Баск бо ванили Мадагаскар"},
                {"ru": "Карамелизованная корочка, кремовая тающая текстура и соус из дикой лесной малины.",
                 "en": "Caramelized charred exterior with ultra-creamy center infused with Bourbon vanilla pods.",
                 "tj": "Чизкейки нарми қаймоқӣ бо малинаи ҷангалӣ."},
                "220 г", "510 ккал", ["лактоза", "яйца"],
                ["Выбор гостей"],
                [],
                [],
                140.0, "TJS", "0x281907"
            ),

            # Cocktails
            (
                created_categories[3].id,
                {"ru": "Royale Smoked Old Fashioned", "en": "Royale Smoked Old Fashioned", "tj": "Royale Smoked Old Fashioned"},
                {"ru": "Бурбон 12 лет, вишневый биттер, кленовый сироп и дым дубовых чипсов под стеклянным клошем.",
                 "en": "Single barrel 12yo bourbon, barrel-aged cherry bitters, maple and aromatic oak smoke.",
                 "tj": "Бурбони 12-сола бо дуди дарахти булут ва сиропи махсус."},
                "160 мл", "190 ккал", [],
                ["Signature Cocktail", "Хит"],
                [],
                [],
                170.0, "TJS", "0x29140a"
            )
        ]

        order_idx = 1
        for cat_id, name, desc, weight, cals, allergens, badges, modifiers, pairings, price, currency, color in dishes_raw:
            # Create video asset
            video_filename = f"sample_dish_{order_idx}.mp4"
            video_path = str(settings.VIDEOS_DIR / video_filename)
            create_sample_video_clip(video_path, name["en"], color, duration=4)

            base_n = f"asset_seed_{order_idx}"
            lqip_p = settings.VIDEOS_DIR / f"{base_n}_lqip.webp"
            hd_p = settings.VIDEOS_DIR / f"{base_n}_hd.webp"
            mob_p = settings.VIDEOS_DIR / f"{base_n}_mobile.mp4"
            kiosk_p = settings.VIDEOS_DIR / f"{base_n}_kiosk.mp4"

            ffmpeg_bin = get_ffmpeg_path()
            try:
                subprocess.run([
                    ffmpeg_bin, "-y", "-ss", "0.1", "-i", video_path, "-vframes", "1",
                    "-vf", "scale=320:568:force_original_aspect_ratio=increase,crop=320:568",
                    "-q:v", "20", str(lqip_p)
                ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

                subprocess.run([
                    ffmpeg_bin, "-y", "-ss", "0.1", "-i", video_path, "-vframes", "1",
                    "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
                    "-q:v", "85", str(hd_p)
                ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

                subprocess.run([
                    ffmpeg_bin, "-y", "-i", video_path,
                    "-vf", "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280",
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-an", "-movflags", "+faststart",
                    str(mob_p)
                ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

                subprocess.run([
                    ffmpeg_bin, "-y", "-i", video_path,
                    "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-an", "-movflags", "+faststart",
                    str(kiosk_p)
                ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except Exception as e:
                logger.warning(f"Error making asset frames: {e}")

            media = MediaAsset(
                status="READY",
                original_filename=video_filename,
                original_url=video_path,
                poster_lqip_url=f"/static/videos/{lqip_p.name}",
                poster_hd_url=f"/static/videos/{hd_p.name}",
                video_mobile_url=f"/static/videos/{mob_p.name}",
                video_kiosk_url=f"/static/videos/{kiosk_p.name}",
                duration_seconds=4
            )
            db.add(media)
            await db.flush()

            dish = Dish(
                restaurant_id=restaurant.id,
                category_id=cat_id,
                name_translations=name,
                description_translations=desc,
                weight_info=weight,
                calories_info=cals,
                allergens=allergens,
                badges=badges,
                modifiers=modifiers,
                pairings=pairings,
                price=price,
                currency=currency,
                is_available=True,
                is_featured=(order_idx == 1),
                display_order=order_idx,
                media_id=media.id
            )
            db.add(dish)
            order_idx += 1

        # Создание нестираемого аккаунта SuperAdmin в базе данных
        await ensure_superadmin_seeded(db)
        await db.commit()
        await ensure_reservation_tables_seeded(db, restaurant)
        logger.info("Database seeding completed successfully!")
