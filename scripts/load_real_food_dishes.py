import asyncio
import os
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, '/home/afzal/video_menu/backend')

from sqlalchemy import select
from app.core.config import settings
from app.core.database import get_session, init_engine
from app.models.restaurant import Restaurant
from app.models.category import Category
from app.models.dish import Dish
from app.models.media import MediaAsset
from app.services.video_transcoder import VideoTranscodeService

async def main():
    print("Initializing engine...")
    await init_engine()
    session = await get_session()

    async with session as db:
        res = await db.execute(select(Restaurant).where(Restaurant.slug == "asr-royale"))
        restaurant = res.scalar_one_or_none()
        if not restaurant:
            print("Restaurant asr-royale not found!")
            return

        cat_res = await db.execute(select(Category).where(Category.restaurant_id == restaurant.id))
        categories = cat_res.scalars().all()
        steaks_cat = next((c for c in categories if "стейк" in str(c.name_translations).lower()), categories[0])
        desserts_cat = next((c for c in categories if "десерт" in str(c.name_translations).lower()), categories[-1])

        videos_dir = settings.VIDEOS_DIR

        real_dishes = [
            {
                "video_input": str(videos_dir / "real_steak_fiery.mp4"),
                "asset_id": 101,
                "category_id": steaks_cat.id,
                "name": {
                    "ru": "Рибай Огненный Сиззл на Гриле",
                    "tj": "Рибайи Оташини Сершира дар Грилл",
                    "en": "Fiery Sizzle Wagyu Ribeye"
                },
                "desc": {
                    "ru": {
                        "description": "Легендарный толстый край мраморной говядины зернового откорма, обжаренный на открытом живом огне до идеальной корочки Medium Rare.",
                        "ingredients": "Мраморная говядина Black Angus 200 дней откорма, морская соль флёр-де-сель, свежемолотый дикий черный перец, свежий розмарин, сливочное масло с тимьяном.",
                        "serving": "Подается с пылу с жару на раскаленной чугунной сковороде со сливочно-чесночным маслом и копченой солью."
                    },
                    "tj": {
                        "description": "Гӯшти мармарии сершира ва олиҷаноби Black Angus, ки дар оташи зиндаи грилл то ҳолати Medium Rare пухта шудааст.",
                        "ingredients": "Гӯшти мармарии Black Angus, намаки баҳрии флёр-де-сел, мурчи сиёҳи кӯфта, розмарини тоза ва равғани маска бо тимйон.",
                        "serving": "Дар тобаи гарми чуянӣ бо равғани маскаи сирдор ва намаки дуддода пешкаш карда мешавад."
                    },
                    "en": {
                        "description": "Signature prime marble ribeye seared over blazing hardwood charcoal grill to achieve a crisp caramelized crust and tender succulent center.",
                        "ingredients": "Grain-fed Black Angus beef, fleur de sel sea salt, crushed wild peppercorns, organic rosemary, whipped garlic-herb butter.",
                        "serving": "Served sizzling hot on cast iron with smoked sea salt and roasted herb bone marrow."
                    }
                },
                "weight": "450 г",
                "calories": "680 ккал",
                "allergens": ["лактоза"],
                "price": 420.0,
                "currency": "TJS",
                "is_featured": True,
                "display_order": 0
            },
            {
                "video_input": str(videos_dir / "real_steak_slice.mp4"),
                "asset_id": 102,
                "category_id": steaks_cat.id,
                "name": {
                    "ru": "Тендерлоин Шеф-Слайс с Трюфелем",
                    "tj": "Тендерлоин Шеф-Слайс бо Трюфел",
                    "en": "Chef's Carved Tenderloin with Truffle"
                },
                "desc": {
                    "ru": {
                        "description": "Исключительно нежная центральная вырезка бычка, нарезанная тонкими сочными слайсами прямо перед подачей.",
                        "ingredients": "Вырезка Prime Tenderloin, масло белого трюфеля Alba, хлопья мальдонской соли, микрогрин базилика, соус демиглас 48 часов вываривания.",
                        "serving": "Сервируется на подогретой гранитной плите с соусом демиглас и свежим черным трюфелем."
                    },
                    "tj": {
                        "description": "Гӯшти бениҳоят мулоими нарм, ки бевосита пеш аз пешкаш бурида шуда, бо равғани трюфел оро дода мешавад.",
                        "ingredients": "Гӯшти нарми Prime Tenderloin, равғани трюфели сафед, намаки Малдон, микрозелении райҳон ва чошнии демиглас.",
                        "serving": "Дар табақи гарми гранитӣ бо чошнии ғализи демиглас пешкаш карда мешавад."
                    },
                    "en": {
                        "description": "Melt-in-your-mouth center-cut tenderloin filet delicately carved table-side with aromatic Alba truffle glaze.",
                        "ingredients": "Prime beef tenderloin, white truffle oil, Maldon sea salt flakes, micro herbs, 48-hour veal demi-glace reduction.",
                        "serving": "Arranged on heated black granite with winter truffle shavings and rich jus."
                    }
                },
                "weight": "320 г",
                "calories": "490 ккал",
                "allergens": ["лактоза"],
                "price": 390.0,
                "currency": "TJS",
                "is_featured": True,
                "display_order": 1
            },
            {
                "video_input": str(videos_dir / "real_dessert_choc.mp4"),
                "asset_id": 103,
                "category_id": desserts_cat.id,
                "name": {
                    "ru": "Шоколадный Десерт Grand Royale 24K",
                    "tj": "Ширинии Шоколадии Grand Royale 24K",
                    "en": "Grand Royale 24K Chocolate Dome"
                },
                "desc": {
                    "ru": {
                        "description": "Глянцевый десерт из французского темного шоколада Valrhona с ореховым пралине и съедобным золотом 24 карата.",
                        "ingredients": "Шоколад Valrhona 72%, дробленый обжаренный фундук, крем маскарпоне, бурбонская ваниль, сусальное золото 24K.",
                        "serving": "Подается в хрустальном клоше с охлажденным ягодным кули из дикой черники."
                    },
                    "tj": {
                        "description": "Ширинии шоколадии фаронсавии Valrhona бо чормағзи бирёншуда ва тиллои воқеии 24K.",
                        "ingredients": "Шоколади сиёҳи Valrhona 72%, фундуқи кӯфта, қаймоқи маскарпоне, ванили бурбонӣ ва тиллои 24K.",
                        "serving": "Дар табақи махсус бо соуси ширини сиёҳмурӯд пешкаш карда мешавад."
                    },
                    "en": {
                        "description": "Lustrous French Valrhona dark chocolate dome layered with hazelnut praline, velvety mascarpone cream and 24K gold foil.",
                        "ingredients": "Valrhona 72% dark chocolate, toasted Piedmont hazelnuts, Madagascar vanilla cream, 24K edible gold leaves.",
                        "serving": "Presented under a glass cloche with cold-pressed wild blueberry coulis."
                    }
                },
                "weight": "210 г",
                "calories": "430 ккал",
                "allergens": ["лактоза", "орехи"],
                "price": 160.0,
                "currency": "TJS",
                "is_featured": True,
                "display_order": 0
            }
        ]

        for item in real_dishes:
            print(f"Transcoding video for {item['name']['ru']}...")
            transcode_res = await VideoTranscodeService.process_video(
                item["video_input"],
                videos_dir,
                item["asset_id"]
            )
            print(f"Transcode done: {transcode_res}")

            media = MediaAsset(
                status="READY",
                original_filename=os.path.basename(item["video_input"]),
                original_url=item["video_input"],
                poster_lqip_url=transcode_res["poster_lqip"],
                poster_hd_url=transcode_res["poster_hd"],
                video_mobile_url=transcode_res["video_mobile"],
                video_kiosk_url=transcode_res["video_kiosk"],
                duration_seconds=5
            )
            db.add(media)
            await db.flush()

            dish = Dish(
                restaurant_id=restaurant.id,
                category_id=item["category_id"],
                name_translations=item["name"],
                description_translations=item["desc"],
                weight_info=item["weight"],
                calories_info=item["calories"],
                allergens=item["allergens"],
                price=item["price"],
                currency=item["currency"],
                is_available=True,
                is_featured=item["is_featured"],
                display_order=item["display_order"],
                media_id=media.id
            )
            db.add(dish)

        await db.commit()
        print("Successfully added real video dishes to database!")

if __name__ == "__main__":
    asyncio.run(main())
