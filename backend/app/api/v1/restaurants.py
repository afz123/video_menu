from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Dict, Any

from app.core.database import get_db
from app.models.restaurant import Restaurant
from app.models.category import Category
from app.models.dish import Dish
from app.models.media import MediaAsset
from app.schemas.restaurant import RestaurantCreate, RestaurantUpdate, RestaurantResponse

router = APIRouter(prefix="/restaurants", tags=["Restaurants"])

@router.get("", response_model=List[RestaurantResponse])
async def list_restaurants(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Restaurant).order_by(Restaurant.id))
    return result.scalars().all()

@router.post("", response_model=RestaurantResponse)
async def create_restaurant(data: RestaurantCreate, db: AsyncSession = Depends(get_db)):
    # Check slug
    existing = await db.execute(select(Restaurant).where(Restaurant.slug == data.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ресторан с таким slug уже существует")

    restaurant = Restaurant(**data.model_dump())
    db.add(restaurant)
    await db.commit()
    await db.refresh(restaurant)
    return restaurant

@router.get("/{slug}", response_model=RestaurantResponse)
async def get_restaurant(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Restaurant).where(Restaurant.slug == slug))
    restaurant = result.scalar_one_or_none()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Ресторан не найден")
    return restaurant

@router.put("/{slug}", response_model=RestaurantResponse)
async def update_restaurant(
    slug: str,
    data: RestaurantUpdate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Restaurant).where(Restaurant.slug == slug))
    restaurant = result.scalar_one_or_none()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Ресторан не найден")

    # If updating slug, check uniqueness
    if data.slug and data.slug != slug:
        existing = await db.execute(select(Restaurant).where(Restaurant.slug == data.slug))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Ресторан с таким URL-slug уже существует")

    update_dict = data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(restaurant, key, value)

    await db.commit()
    await db.refresh(restaurant)
    return restaurant

@router.put("/{slug}/theme")
async def update_restaurant_theme(
    slug: str,
    theme_config: Dict[str, Any] = Body(...),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Restaurant).where(Restaurant.slug == slug))
    restaurant = result.scalar_one_or_none()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Ресторан не найден")
    
    restaurant.theme_config = theme_config
    await db.commit()
    return {"status": "success", "theme_config": restaurant.theme_config}

@router.get("/{slug}/full-menu")
async def get_restaurant_full_menu(
    slug: str,
    include_unavailable: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """
    Optimized single-query tree endpoint delivering the complete localized menu.
    Used by Mobile Reels and Kiosk touch displays.
    """
    result = await db.execute(
        select(Restaurant)
        .where(Restaurant.slug == slug)
        .options(
            selectinload(Restaurant.categories)
            .selectinload(Category.dishes)
            .selectinload(Dish.media)
        )
    )
    restaurant = result.scalar_one_or_none()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Ресторан не найден")
    
    categories_data = []
    for cat in sorted(restaurant.categories, key=lambda c: c.display_order):
        if not include_unavailable and not cat.is_active:
            continue
        
        dishes_list = []
        for dish in sorted(cat.dishes, key=lambda d: d.display_order):
            if not include_unavailable and not dish.is_available:
                continue

            media_info = None
            if dish.media:
                media_info = {
                    "id": dish.media.id,
                    "status": dish.media.status,
                    "lqip": dish.media.poster_lqip_url,
                    "poster": dish.media.poster_hd_url,
                    "video_mobile": dish.media.video_mobile_url,
                    "video_kiosk": dish.media.video_kiosk_url,
                    "duration": dish.media.duration_seconds
                }

            dishes_list.append({
                "id": dish.id,
                "name": dish.name_translations,
                "description": dish.description_translations or {},
                "price": float(dish.price),
                "currency": dish.currency,
                "weight": dish.weight_info,
                "calories": dish.calories_info,
                "allergens": dish.allergens or [],
                "is_available": dish.is_available,
                "is_featured": dish.is_featured,
                "display_order": dish.display_order,
                "category_id": dish.category_id,
                "media": media_info
            })

        categories_data.append({
            "id": cat.id,
            "name": cat.name_translations,
            "icon": cat.icon,
            "display_order": cat.display_order,
            "is_active": cat.is_active,
            "dishes": dishes_list
        })

    return {
        "restaurant": {
            "id": restaurant.id,
            "name": restaurant.name,
            "slug": restaurant.slug,
            "tagline": restaurant.tagline,
            "description": restaurant.description,
            "theme": restaurant.theme_config or {},
            "supported_locales": restaurant.supported_locales or ["ru", "en", "tj"],
            "default_locale": restaurant.default_locale or "ru"
        },
        "categories": categories_data
    }
