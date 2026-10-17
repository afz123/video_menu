from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Dict, Any, Optional

from app.core.database import get_db
from app.core.security import get_current_admin
from app.models.restaurant import Restaurant
from app.models.category import Category
from app.models.dish import Dish
from app.models.media import MediaAsset
from app.models.service_request import ServiceRequest
from app.schemas.restaurant import RestaurantCreate, RestaurantUpdate, RestaurantResponse
from app.schemas.service_request import (
    ServiceRequestCreate,
    ServiceRequestResponse,
    ServiceRequestStatusUpdate
)

router = APIRouter(prefix="/restaurants", tags=["Restaurants"])

async def find_restaurant_by_slug(slug: str, db: AsyncSession, options=None) -> Optional[Restaurant]:
    """Find restaurant by active slug or historic alias (preserves printed table QRs)"""
    query = select(Restaurant).where(Restaurant.slug == slug)
    if options:
        query = query.options(*options)
    res = await db.execute(query)
    rest = res.scalar_one_or_none()
    if rest:
        return rest
    
    # Check old slugs aliases
    all_query = select(Restaurant)
    if options:
        all_query = all_query.options(*options)
    all_res = await db.execute(all_query)
    for r in all_res.scalars().all():
        if r.old_slugs and slug in r.old_slugs:
            return r
    return None

@router.get("", response_model=List[RestaurantResponse])
async def list_restaurants(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Restaurant).order_by(Restaurant.id))
    return result.scalars().all()

@router.post("", response_model=RestaurantResponse)
async def create_restaurant(
    data: RestaurantCreate,
    current_admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
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
    restaurant = await find_restaurant_by_slug(slug, db)
    if not restaurant:
        raise HTTPException(status_code=404, detail="Ресторан не найден")
    return restaurant

@router.put("/{slug}", response_model=RestaurantResponse)
async def update_restaurant(
    slug: str,
    data: RestaurantUpdate,
    current_admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    restaurant = await find_restaurant_by_slug(slug, db)
    if not restaurant:
        raise HTTPException(status_code=404, detail="Ресторан не найден")

    # If updating slug, preserve old slug in old_slugs to avoid 404 on printed QRs
    if data.slug and data.slug != restaurant.slug:
        existing = await db.execute(select(Restaurant).where(Restaurant.slug == data.slug))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Ресторан с таким URL-slug уже существует")
        
        old_slugs_list = list(restaurant.old_slugs or [])
        if restaurant.slug not in old_slugs_list:
            old_slugs_list.append(restaurant.slug)
        restaurant.old_slugs = old_slugs_list
        restaurant.slug = data.slug

    update_dict = data.model_dump(exclude_unset=True)
    update_dict.pop("slug", None) # already handled above
    for key, value in update_dict.items():
        setattr(restaurant, key, value)

    await db.commit()
    await db.refresh(restaurant)
    return restaurant

@router.put("/{slug}/theme")
async def update_restaurant_theme(
    slug: str,
    theme_config: Dict[str, Any] = Body(...),
    current_admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    restaurant = await find_restaurant_by_slug(slug, db)
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
    Includes badges, modifiers, pairings, and dayparting schedules.
    """
    options = [
        selectinload(Restaurant.categories)
        .selectinload(Category.dishes)
        .selectinload(Dish.media)
    ]
    restaurant = await find_restaurant_by_slug(slug, db, options=options)
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
                "badges": dish.badges or [],
                "modifiers": dish.modifiers or [],
                "pairings": dish.pairings or [],
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
            "schedule_start": cat.schedule_start,
            "schedule_end": cat.schedule_end,
            "daypart": cat.daypart or "all",
            "dishes": dishes_list
        })

    return {
        "restaurant": {
            "id": restaurant.id,
            "name": restaurant.name,
            "slug": restaurant.slug,
            "old_slugs": restaurant.old_slugs or [],
            "tagline": restaurant.tagline,
            "description": restaurant.description,
            "theme": restaurant.theme_config or {},
            "supported_locales": restaurant.supported_locales or ["ru", "en", "tj"],
            "default_locale": restaurant.default_locale or "ru"
        },
        "categories": categories_data
    }

# -------------------------------------------------------------
# Smart Table Service (Call Waiter, Request Bill, Guest Orders)
# -------------------------------------------------------------

@router.post("/{slug}/service-requests", response_model=ServiceRequestResponse)
async def create_service_request(
    slug: str,
    data: ServiceRequestCreate,
    db: AsyncSession = Depends(get_db)
):
    restaurant = await find_restaurant_by_slug(slug, db)
    if not restaurant:
        raise HTTPException(status_code=404, detail="Ресторан не найден")

    req = ServiceRequest(
        restaurant_id=restaurant.id,
        table_number=data.table_number.strip(),
        request_type=data.request_type,
        guest_comment=data.guest_comment,
        cart_items=data.cart_items or [],
        status="PENDING"
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)
    return req

@router.get("/{slug}/service-requests", response_model=List[ServiceRequestResponse])
async def list_service_requests(
    slug: str,
    status: Optional[str] = None,
    current_admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    restaurant = await find_restaurant_by_slug(slug, db)
    if not restaurant:
        raise HTTPException(status_code=404, detail="Ресторан не найден")

    query = select(ServiceRequest).where(ServiceRequest.restaurant_id == restaurant.id).order_by(ServiceRequest.created_at.desc())
    if status:
        query = query.where(ServiceRequest.status == status)
    result = await db.execute(query)
    return result.scalars().all()

@router.patch("/{slug}/service-requests/{req_id}/status", response_model=ServiceRequestResponse)
async def update_service_request_status(
    slug: str,
    req_id: int,
    data: ServiceRequestStatusUpdate,
    current_admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    req = await db.get(ServiceRequest, req_id)
    if not req:
        raise HTTPException(status_code=404, detail="Запрос не найден")

    req.status = data.status
    await db.commit()
    await db.refresh(req)
    return req
