import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException, Body, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Dict, Any, Optional

logger = logging.getLogger("video_menu.restaurants")

from app.core.database import get_db
from app.core.security import get_current_admin, check_restaurant_access, hash_password
from app.models.restaurant import Restaurant
from app.models.category import Category
from app.models.dish import Dish
from app.models.media import MediaAsset
from app.models.service_request import ServiceRequest
from app.schemas.restaurant import RestaurantCreate, RestaurantUpdate, RestaurantResponse
from sqlalchemy import text
from app.services.telegram_service import TelegramService
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
    
    # Check old slugs aliases efficiently via targeted query without full table scan
    alias_query = select(Restaurant).where(text("CAST(old_slugs AS TEXT) LIKE :pattern")).params(pattern=f'%"{slug}"%')
    if options:
        alias_query = alias_query.options(*options)
    alias_res = await db.execute(alias_query)
    for r in alias_res.scalars().all():
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

    rest_dict = data.model_dump(exclude={"admin_password"})
    restaurant = Restaurant(**rest_dict)
    if data.admin_password:
        restaurant.admin_password_hash = hash_password(data.admin_password.strip())

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

    check_restaurant_access(current_admin, restaurant.id)

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
    if "admin_password" in update_dict:
        raw_pwd = update_dict.pop("admin_password")
        if raw_pwd and raw_pwd.strip():
            restaurant.admin_password_hash = hash_password(raw_pwd.strip())

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

    check_restaurant_access(current_admin, restaurant.id)
    
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
                "currency": dish.currency or restaurant.currency or "TJS",
                "weight": dish.weight_info,
                "calories": dish.calories_info,
                "allergens": dish.allergens or [],
                "badges": dish.badges or [],
                "modifiers": dish.modifiers or [],
                "pairings": dish.pairings or [],
                "is_available": dish.is_available,
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
            "currency": restaurant.currency or "TJS",
            "call_types_enabled": restaurant.call_types_enabled or ["waiter", "bill", "sommelier", "hookah", "admin"],
            "service_charge_percent": restaurant.service_charge_percent if restaurant.service_charge_percent is not None else 10.0,
            "telegram_enabled": bool(restaurant.telegram_enabled),
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
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    restaurant = await find_restaurant_by_slug(slug, db)
    if not restaurant:
        raise HTTPException(status_code=404, detail="Ресторан не найден")

    # Stop-list validation for orders
    if data.request_type == "order" and data.cart_items:
        dish_ids = [
            int(item.get("dish_id") or item.get("id"))
            for item in data.cart_items
            if (item.get("dish_id") or item.get("id")) and str(item.get("dish_id") or item.get("id")).isdigit()
        ]
        if dish_ids:
            query = select(Dish).where(
                Dish.restaurant_id == restaurant.id,
                Dish.id.in_(dish_ids),
                Dish.is_available == False
            )
            res = await db.execute(query)
            unavailable = res.scalars().all()
            if unavailable:
                names = [d.name_translations.get("ru") or str(d.id) for d in unavailable]
                raise HTTPException(
                    status_code=400,
                    detail=f"Следующие позиции временно недоступны (в стоп-листе): {', '.join(names)}. Пожалуйста, обновите заказ."
                )

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

    # Deliver reliable alert to staff Telegram group via FastAPI BackgroundTasks
    if restaurant.telegram_enabled and restaurant.telegram_bot_token and restaurant.telegram_chat_id:
        try:
            background_tasks.add_task(
                TelegramService.notify_service_request,
                bot_token=restaurant.telegram_bot_token,
                chat_id=restaurant.telegram_chat_id,
                restaurant_name=restaurant.name,
                table_number=req.table_number,
                request_type=req.request_type,
                guest_comment=req.guest_comment,
                cart_items=req.cart_items,
                service_charge_percent=restaurant.service_charge_percent if restaurant.service_charge_percent is not None else 10.0,
                restaurant_currency=restaurant.currency or "TJS"
            )
        except Exception as e:
            logger.error(f"Failed to queue telegram notification: {e}")

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

    check_restaurant_access(current_admin, restaurant.id)

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

    check_restaurant_access(current_admin, req.restaurant_id)

    req.status = data.status
    await db.commit()
    await db.refresh(req)
    return req

@router.post("/{slug}/test-telegram")
async def test_telegram_connection(
    slug: str,
    current_admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Admin endpoint to verify Telegram bot token and chat connection."""
    restaurant = await find_restaurant_by_slug(slug, db)
    if not restaurant:
        raise HTTPException(status_code=404, detail="Ресторан не найден")

    check_restaurant_access(current_admin, restaurant.id)

    if not restaurant.telegram_bot_token or not restaurant.telegram_chat_id:
        raise HTTPException(status_code=400, detail="Telegram Bot Token или Chat ID не заполнены в настройках ресторана")

    test_msg = (
        f"🔔 <b>ТЕСТ СВЯЗИ С РЕСТОРАНОМ</b>\n"
        f"🏛️ <b>Заведение:</b> {restaurant.name}\n"
        f"✅ Telegram-бот успешно подключен к платформе Video Menu!\n"
        f"Сюда будут мгновенно приходить вызовы официанта, запросы счёта и заказы гостей с номерами столов."
    )
    ok = await TelegramService.send_message(
        bot_token=restaurant.telegram_bot_token,
        chat_id=restaurant.telegram_chat_id,
        text=test_msg
    )
    if not ok:
        raise HTTPException(status_code=502, detail="Не удалось доставить сообщение в Telegram. Проверьте правильность Bot Token и Chat ID (убедитесь, что бот добавлен в чат/группу).")

    return {"status": "ok", "message": "Тестовое уведомление успешно отправлено в Telegram"}

@router.post("/{target_slug}/clone-menu-from/{source_slug}")
async def clone_menu_from_donor(
    target_slug: str,
    source_slug: str,
    current_admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Clones all categories and dishes from a donor restaurant into the target restaurant.
    Enables instantaneous 1-click rollout for new branches and franchise points.
    """
    target = await find_restaurant_by_slug(target_slug, db)
    if not target:
        raise HTTPException(status_code=404, detail="Целевой филиал не найден")

    check_restaurant_access(current_admin, target.id)

    source = await find_restaurant_by_slug(source_slug, db)
    if not source:
        raise HTTPException(status_code=404, detail="Ресторан-донор не найден")

    if target.id == source.id:
        raise HTTPException(status_code=400, detail="Нельзя клонировать меню само в себя")

    cat_res = await db.execute(
        select(Category)
        .where(Category.restaurant_id == source.id)
        .options(selectinload(Category.dishes))
        .order_by(Category.display_order)
    )
    donor_categories = cat_res.scalars().all()

    cats_cloned = 0
    dishes_cloned = 0

    for d_cat in donor_categories:
        new_cat = Category(
            restaurant_id=target.id,
            name_translations=dict(d_cat.name_translations or {}),
            icon=d_cat.icon,
            display_order=d_cat.display_order,
            is_active=d_cat.is_active,
            schedule_start=d_cat.schedule_start,
            schedule_end=d_cat.schedule_end,
            daypart=d_cat.daypart
        )
        db.add(new_cat)
        await db.flush()
        cats_cloned += 1

        for d_dish in d_cat.dishes:
            new_dish = Dish(
                restaurant_id=target.id,
                category_id=new_cat.id,
                name_translations=dict(d_dish.name_translations or {}),
                description_translations=dict(d_dish.description_translations or {}),
                price=d_dish.price,
                currency=target.currency or d_dish.currency,
                weight_info=d_dish.weight_info,
                calories_info=d_dish.calories_info,
                allergens=list(d_dish.allergens or []),
                badges=list(d_dish.badges or []),
                modifiers=list(d_dish.modifiers or []),
                pairings=list(d_dish.pairings or []),
                media_id=d_dish.media_id,
                is_available=True,
                is_featured=d_dish.is_featured,
                display_order=d_dish.display_order
            )
            db.add(new_dish)
            dishes_cloned += 1

    await db.commit()
    return {
        "status": "success",
        "message": f"Меню успешно скопировано из '{source.name}' в '{target.name}'",
        "categories_cloned": cats_cloned,
        "dishes_cloned": dishes_cloned
    }
