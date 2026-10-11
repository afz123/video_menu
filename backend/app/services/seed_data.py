import asyncio
import os
import subprocess
import logging
from sqlalchemy import select
from app.core.config import settings
from app.core.database import get_session, init_engine, Base
from app.models.restaurant import Restaurant
from app.models.category import Category
from app.models.dish import Dish
from app.models.media import MediaAsset
from app.services.video_transcoder import get_ffmpeg_path

logger = logging.getLogger("video_menu.seeder")

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

async def seed_database():
    engine = await init_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session = await get_session()
    async with session as db:
        # Check if restaurant exists
        res = await db.execute(select(Restaurant).where(Restaurant.slug == "asr-royale"))
        existing_rest = res.scalar_one_or_none()
        if existing_rest:
            logger.info("Database already seeded with asr-royale")
            return

        logger.info("Seeding database with demo luxury restaurant...")

        # Create demo restaurant
        restaurant = Restaurant(
            name="ASR Maison Royale",
            slug="asr-royale",
            tagline="Haute Cuisine & Dry-Aged Steaks",
            description="Флагманский гастрономический ресторан премиум-класса с авторской кухней шеф-повара и собственной камерой сухого вызревания мяса.",
            supported_locales=["ru", "en", "tj"],
            default_locale="ru",
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

        # 4 Categories
        categories_data = [
            {
                "name": {"ru": "Фирменные стейки", "en": "Signature Steaks", "tj": "Стейкҳои хусусӣ"},
                "icon": "flame",
                "order": 1
            },
            {
                "name": {"ru": "Холодные закуски & Raw Bar", "en": "Cold Appetizers & Raw Bar", "tj": "Газакҳои сард"},
                "icon": "sparkles",
                "order": 2
            },
            {
                "name": {"ru": "Десерты от шефа", "en": "Chef's Desserts", "tj": "Шириниҳои сарошпаз"},
                "icon": "cake",
                "order": 3
            },
            {
                "name": {"ru": "Авторский бар", "en": "Craft Bar", "tj": "Бари муаллифӣ"},
                "icon": "wine",
                "order": 4
            }
        ]

        created_categories = []
        for cdata in categories_data:
            cat = Category(
                restaurant_id=restaurant.id,
                name_translations=cdata["name"],
                icon=cdata["icon"],
                display_order=cdata["order"]
            )
            db.add(cat)
            created_categories.append(cat)
        await db.flush()

        # Dishes data
        dishes_raw = [
            # Steaks
            (
                created_categories[0].id,
                {"ru": "Томагавк Dry-Aged 45 дней", "en": "Tomahawk Dry-Aged 45 Days", "tj": "Томагавк 45-рӯзаи хушкшуда"},
                {"ru": "Премиальный рибай на кости сухого вызревания с розмариновым маслом, печеным чесноком и черным трюфелем.",
                 "en": "Prime bone-in ribeye with rosemary herb butter, roasted black garlic and shaved winter truffle.",
                 "tj": "Рибайи олиҷаноб бо равғани розмарин ва сири сиёҳи пухта."},
                "1100 г", "980 ккал", ["лактоза"], 890.0, "TJS", "0x2e1208"
            ),
            (
                created_categories[0].id,
                {"ru": "Филе-миньон Prime с фуа-гра", "en": "Prime Filet Mignon & Foie Gras", "tj": "Филе-минйон Prime бо фуа-гра"},
                {"ru": "Нежнейшая мраморная вырезка зернового откорма, эскалоп из утиной фуа-гра и демиглас на портвейне.",
                 "en": "Tender grain-fed tenderloin medallion, seared duck foie gras escalope and ruby port reduction.",
                 "tj": "Гӯшти нарм бо фуа-гра ва чошнии махсуси демиглас."},
                "340 г", "620 ккал", ["лактоза"], 450.0, "TJS", "0x2b1509"
            ),
            (
                created_categories[0].id,
                {"ru": "Каре новозеландского ягненка", "en": "New Zealand Lamb Rack", "tj": "Гӯшти барраи Зеландияи Нав"},
                {"ru": "Королевское каре в фисташковой панировке с пюре из печеного сельдерея и можжевеловым соусом.",
                 "en": "Crusted pistachio herb rack with velvety celeriac puree and mountain juniper glaze.",
                 "tj": "Караи барра бо писта ва пюреи махсус."},
                "420 г", "580 ккал", ["орехи", "лактоза"], 380.0, "TJS", "0x201309"
            ),

            # Appetizers
            (
                created_categories[1].id,
                {"ru": "Тартар из мраморной говядины", "en": "Prime Wagyu Tartare", "tj": "Тартар аз гӯшти мармарӣ"},
                {"ru": "Тонко нарезанная вырезка Black Angus с трюфельным айоли, каперсами и чипсом из льна.",
                 "en": "Hand-cut Black Angus with black truffle aioli, salted capers, quail yolk and flaxseed crisp.",
                 "tj": "Тартари хушсифат бо айолии трюфел ва зардии тухми бедона."},
                "210 г", "340 ккал", ["яйца"], 210.0, "TJS", "0x161a0a"
            ),
            (
                created_categories[1].id,
                {"ru": "Карпаччо из дикого гребешка", "en": "Wild Sea Scallop Carpaccio", "tj": "Карпаччо аз гребешоки баҳрӣ"},
                {"ru": "Сахалинский гребешок, цитрусовый юдзу-дрессинг, слайсы черного трюфеля и микрозелень.",
                 "en": "Thinly shaved sea scallops, yuzu citrus ponzu, black winter truffle pearls and purple shiso.",
                 "tj": "Гребешоки баҳрӣ бо соуси ситрусии юдзу ва трюфел."},
                "180 г", "210 ккал", ["морепродукты"], 260.0, "TJS", "0x0d1f1c"
            ),

            # Desserts
            (
                created_categories[2].id,
                {"ru": "Золотая сфера Grand Cru", "en": "Grand Cru Golden Sphere", "tj": "Кураи тиллоии Grand Cru"},
                {"ru": "Шоколадный ганаш Valrhona 70%, жидкая сердцевина из маракуйи и съедобное сусальное золото 24K.",
                 "en": "Dark Valrhona 70% chocolate dome, passion fruit melting core and 24K edible gold leaves.",
                 "tj": "Шоколади сиёҳи фаронсавӣ бо дили маракуйя ва тиллои 24K."},
                "190 г", "440 ккал", ["лактоза"], 180.0, "TJS", "0x2a1a06"
            ),
            (
                created_categories[2].id,
                {"ru": "Баскский чизкейк с ванилью Мадагаскар", "en": "Madagascan Basque Cheesecake", "tj": "Чизкейки Баск бо ванили Мадагаскар"},
                {"ru": "Карамелизованная корочка, кремовая тающая текстура и соус из дикой лесной малины.",
                 "en": "Caramelized charred exterior with ultra-creamy center infused with Bourbon vanilla pods.",
                 "tj": "Чизкейки нарми қаймоқӣ бо малинаи ҷангалӣ."},
                "220 г", "510 ккал", ["лактоза", "яйца"], 140.0, "TJS", "0x281907"
            ),

            # Cocktails
            (
                created_categories[3].id,
                {"ru": "Royale Smoked Old Fashioned", "en": "Royale Smoked Old Fashioned", "tj": "Royale Smoked Old Fashioned"},
                {"ru": "Бурбон 12 лет, вишневый биттер, кленовый сироп и дым дубовых чипсов под стеклянным клошем.",
                 "en": "Single barrel 12yo bourbon, barrel-aged cherry bitters, maple and aromatic oak smoke.",
                 "tj": "Бурбони 12-сола бо дуди дарахти булут ва сиропи махсус."},
                "160 мл", "190 ккал", [], 170.0, "TJS", "0x29140a"
            )
        ]

        order_idx = 1
        for cat_id, name, desc, weight, cals, allergens, price, currency, color in dishes_raw:
            # Create video asset
            video_filename = f"sample_dish_{order_idx}.mp4"
            video_path = str(settings.VIDEOS_DIR / video_filename)
            create_sample_video_clip(video_path, name["en"], color, duration=4)

            # Transcode into standard artifacts
            base_n = f"asset_seed_{order_idx}"
            lqip_p = settings.VIDEOS_DIR / f"{base_n}_lqip.webp"
            hd_p = settings.VIDEOS_DIR / f"{base_n}_hd.webp"
            mob_p = settings.VIDEOS_DIR / f"{base_n}_mobile.mp4"
            kiosk_p = settings.VIDEOS_DIR / f"{base_n}_kiosk.mp4"

            # Quick copy/transcode for sample
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
                price=price,
                currency=currency,
                is_available=True,
                is_featured=(order_idx == 1),
                display_order=order_idx,
                media_id=media.id
            )
            db.add(dish)
            order_idx += 1

        await db.commit()
        logger.info("Database seeding completed successfully!")
