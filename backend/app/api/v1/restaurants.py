import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException, Body, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Dict, Any, Optional

logger = logging.getLogger("video_menu.restaurants")

from app.core.config import settings, DEFAULT_UI_CONFIG
from sqlalchemy.orm.attributes import flag_modified
from app.core.database import get_db
from app.core.security import (
    get_current_admin,
    check_restaurant_access,
    hash_password,
    hash_password_async,
    generate_table_signature,
    verify_table_signature
)
from app.core.business_engine import resolve_restaurant_engine_config
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
from app.core.licensing import require_module, ModuleAccess, DEFAULT_MODULES

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

    # Fast indexed search in historic old_slugs JSON array without full-table LIKE scan
    bind = db.bind
    is_postgres = bind and "postgresql" in bind.dialect.name
    try:
        if is_postgres:
            from sqlalchemy import cast
            from sqlalchemy.dialects.postgresql import JSONB
            alias_query = select(Restaurant).where(cast(Restaurant.old_slugs, JSONB).contains([slug]))
        else:
            alias_query = select(Restaurant).where(
                text("EXISTS (SELECT 1 FROM json_each(restaurants.old_slugs) WHERE json_each.value = :slug)")
            ).params(slug=slug)

        if options:
            alias_query = alias_query.options(*options)
        alias_res = await db.execute(alias_query)
        r = alias_res.scalars().first()
        if r:
            return r
    except Exception:
        pass

    # Safety fallback
    fallback_query = select(Restaurant)
    if options:
        fallback_query = fallback_query.options(*options)
    all_res = await db.execute(fallback_query)
    for r in all_res.scalars().all():
        if r.old_slugs and isinstance(r.old_slugs, list) and slug in r.old_slugs:
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
    ui_cfg = rest_dict.pop("ui_config", None)
    if ui_cfg:
        theme = rest_dict.get("theme_config") or {}
        theme["ui_config"] = ui_cfg
        rest_dict["theme_config"] = theme

    restaurant = Restaurant(**rest_dict)
    if data.admin_password:
        restaurant.admin_password_hash = await hash_password_async(data.admin_password.strip())

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
            restaurant.admin_password_hash = await hash_password_async(raw_pwd.strip())

    if "ui_config" in update_dict:
        ui_cfg = update_dict.pop("ui_config")
        current_theme = dict(restaurant.theme_config or {})
        current_theme["ui_config"] = ui_cfg
        restaurant.theme_config = current_theme
        flag_modified(restaurant, "theme_config")

    for key, value in update_dict.items():
        setattr(restaurant, key, value)

    if "enabled_modules" in update_dict:
        flag_modified(restaurant, "enabled_modules")
    if "call_types_enabled" in update_dict:
        flag_modified(restaurant, "call_types_enabled")

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
    flag_modified(restaurant, "theme_config")
    await db.commit()
    return {"status": "success", "theme_config": restaurant.theme_config}

@router.put("/{slug}/ui-config")
async def update_restaurant_ui_config(
    slug: str,
    ui_config: Dict[str, Any] = Body(...),
    current_admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    restaurant = await find_restaurant_by_slug(slug, db)
    if not restaurant:
        raise HTTPException(status_code=404, detail="Ресторан не найден")

    check_restaurant_access(current_admin, restaurant.id)
    
    current_theme = dict(restaurant.theme_config or {})
    current_theme["ui_config"] = ui_config
    restaurant.theme_config = current_theme
    flag_modified(restaurant, "theme_config")
    await db.commit()
    await db.refresh(restaurant)
    return {
        "status": "success",
        "ui_config": (restaurant.theme_config or {}).get("ui_config", DEFAULT_UI_CONFIG)
    }

@router.get("/{slug}/full-menu")
async def get_restaurant_full_menu(
    slug: str,
    include_unavailable: bool = False,
    table: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Optimized single-query tree endpoint delivering the complete localized menu.
    Includes badges, modifiers, pairings, dayparting schedules, and white-label business engine.
    """
    options = [
        selectinload(Restaurant.categories)
        .selectinload(Category.dishes)
        .selectinload(Dish.media),
        selectinload(Restaurant.dining_tables)
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

    # White-Label engine config resolution
    engine_config = resolve_restaurant_engine_config(restaurant.theme_config)

    # Generate HMAC table signature if table query parameter is provided
    table_sig = None
    if table and table.strip():
        table_sig = generate_table_signature(restaurant.id, table.strip())

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
            "enabled_modules": restaurant.enabled_modules or DEFAULT_MODULES,
            "service_charge_percent": restaurant.service_charge_percent if restaurant.service_charge_percent is not None else 10.0,
            "telegram_enabled": bool(restaurant.telegram_enabled),
            "theme": restaurant.theme_config or {},
            "ui_config": (restaurant.theme_config or {}).get("ui_config", DEFAULT_UI_CONFIG),
            "engine_config": engine_config,
            "supported_locales": restaurant.supported_locales or ["ru", "en", "tj"],
            "default_locale": restaurant.default_locale or "ru",
            "table_number": table.strip() if table else None,
            "table_signature": table_sig,
            "available_tables": [t.table_number for t in getattr(restaurant, "dining_tables", []) if t.is_active]
        },
        "categories": categories_data
    }

# -------------------------------------------------------------
# Table Cryptographic Verification & White-Label Config
# -------------------------------------------------------------

@router.get("/{slug}/table-signature")
async def get_table_signature(
    slug: str,
    table: str,
    db: AsyncSession = Depends(get_db)
):
    """Generates an HMAC-SHA256 signature for a specific table."""
    restaurant = await find_restaurant_by_slug(slug, db)
    if not restaurant:
        raise HTTPException(status_code=404, detail="Ресторан не найден")
    sig = generate_table_signature(restaurant.id, table.strip())
    return {
        "restaurant_id": restaurant.id,
        "table_number": table.strip(),
        "signature": sig,
        "signed_url": f"/menu/{slug}?table={table.strip()}&sign={sig}"
    }

@router.get("/{slug}/table-signatures")
async def get_table_signatures(
    slug: str,
    count: Optional[int] = 50,
    tables: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Batch-generates HMAC signatures for QR code generators and physical tent printing."""
    restaurant = await find_restaurant_by_slug(slug, db)
    if not restaurant:
        raise HTTPException(status_code=404, detail="Ресторан не найден")

    table_list = []
    if tables:
        table_list = [t.strip() for t in tables.split(",") if t.strip()]
    else:
        table_list = [str(i) for i in range(1, max(1, min(100, count or 50)) + 1)]

    results = []
    for t in table_list:
        sig = generate_table_signature(restaurant.id, t)
        results.append({
            "table_number": t,
            "signature": sig,
            "signed_url": f"/menu/{slug}?table={t}&sign={sig}"
        })
    return results

@router.get("/{slug}/engine-config")
async def get_restaurant_engine_config(
    slug: str,
    db: AsyncSession = Depends(get_db)
):
    """Returns resolved White-Label configuration for dynamic UI rendering."""
    restaurant = await find_restaurant_by_slug(slug, db)
    if not restaurant:
        raise HTTPException(status_code=404, detail="Ресторан не найден")
    return resolve_restaurant_engine_config(restaurant.theme_config)

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

    # Commercial License Feature-Gating (Pay-per-Module isolation)
    if data.request_type in ("order", "repeat_order"):
        require_module(restaurant, ModuleAccess.ORDERING)
    else:
        require_module(restaurant, ModuleAccess.SERVICE_DISPATCH)

    normalized_table = data.table_number.strip()

    # Anti-spoofing table signature verification: strictly enforced unless kiosk internal request
    is_kiosk_request = bool(data.guest_session_id and data.guest_session_id.startswith("kiosk_internal_"))
    if not is_kiosk_request:
        if not data.table_token or not verify_table_signature(restaurant.id, normalized_table, data.table_token):
            logger.warning(
                f"SECURITY ALERT: Spoofing attempt blocked for restaurant {restaurant.id}, "
                f"table {normalized_table}, provided token: {data.table_token}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Вызов заблокирован: недействительная цифровая подпись стола. Требуется скан оригинального QR-кода столика заведения."
            )

    # Anti-spam rate-limit / debounce for waiter calls (45s window)
    if data.request_type != "order":
        from datetime import datetime, timedelta
        cutoff = datetime.utcnow() - timedelta(seconds=45)
        recent_req = await db.execute(
            select(ServiceRequest).where(
                ServiceRequest.restaurant_id == restaurant.id,
                ServiceRequest.table_number == normalized_table,
                ServiceRequest.request_type == data.request_type,
                ServiceRequest.status == "PENDING",
                ServiceRequest.created_at >= cutoff
            )
        )
        if recent_req.scalars().first():
            raise HTTPException(
                status_code=429,
                detail="Официант уже уведомлен о вашем вызове и направляется к вашему столу!"
            )

    # Stop-list validation with row-level locking (P0: 1.2 Race Condition fix)
    if data.request_type in ("order", "repeat_order") and data.cart_items:
        dish_ids = [
            int(item.get("dish_id") or item.get("id"))
            for item in data.cart_items
            if (item.get("dish_id") or item.get("id")) and str(item.get("dish_id") or item.get("id")).isdigit()
        ]
        if dish_ids:
            query = select(Dish).where(
                Dish.restaurant_id == restaurant.id,
                Dish.id.in_(dish_ids)
            )
            # Use transactional row-level lock on PostgreSQL
            bind = db.bind
            if bind and "postgresql" in bind.dialect.name:
                query = query.with_for_update()

            res = await db.execute(query)
            locked_dishes = {d.id: d for d in res.scalars().all()}
            stopped_names = [
                d.name_translations.get("ru", str(d.id))
                for d_id, d in locked_dishes.items()
                if not d.is_available
            ]
            if stopped_names:
                raise HTTPException(
                    status_code=409,
                    detail=f"Позиция только что встала на стоп: {', '.join(stopped_names)}. Пожалуйста, обновите выбор."
                )

    # Compute financial breakdown
    subtotal = 0.0
    if data.cart_items:
        for it in data.cart_items:
            qty = int(it.get("quantity", 1))
            price = float(it.get("total_price") or it.get("price") or 0.0)
            subtotal += price * qty

    svc_percent = float(restaurant.service_charge_percent if restaurant.service_charge_percent is not None else 10.0)
    svc_charge = subtotal * (svc_percent / 100.0)
    tip_amt = float(data.tip_amount or 0.0)
    if not tip_amt and data.tip_percent and subtotal > 0:
        tip_amt = subtotal * (float(data.tip_percent) / 100.0)
    grand_total = subtotal + svc_charge + tip_amt

    req = ServiceRequest(
        restaurant_id=restaurant.id,
        table_number=normalized_table,
        request_type=data.request_type,
        guest_session_id=data.guest_session_id,
        table_signature=data.table_token,
        guest_comment=data.guest_comment,
        cart_items=data.cart_items or [],
        subtotal_amount=round(subtotal, 2),
        service_charge_amount=round(svc_charge, 2),
        total_amount=round(grand_total, 2),
        currency=restaurant.currency or "TJS",
        nps_score=data.nps_score,
        status="PENDING"
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)

    # Telegram alerts dispatch via FastAPI BackgroundTasks
    if restaurant.telegram_enabled and restaurant.telegram_bot_token and restaurant.telegram_chat_id:
        try:
            # High-priority alert if low NPS rating (1-3 stars)
            if data.nps_score is not None and int(data.nps_score) <= 3:
                background_tasks.add_task(
                    TelegramService.notify_low_nps_alert,
                    bot_token=restaurant.telegram_bot_token,
                    chat_id=restaurant.telegram_chat_id,
                    restaurant_name=restaurant.name,
                    table_number=req.table_number,
                    nps_score=int(data.nps_score),
                    guest_comment=data.guest_comment
                )

            background_tasks.add_task(
                TelegramService.notify_service_request,
                bot_token=restaurant.telegram_bot_token,
                chat_id=restaurant.telegram_chat_id,
                restaurant_name=restaurant.name,
                table_number=req.table_number,
                request_type=req.request_type,
                guest_comment=req.guest_comment,
                cart_items=req.cart_items,
                service_charge_percent=svc_percent,
                restaurant_currency=restaurant.currency or "TJS",
                tip_amount=tip_amt
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
    if data.acknowledged_by:
        req.acknowledged_by = data.acknowledged_by
    await db.commit()
    await db.refresh(req)
    return req


# -------------------------------------------------------------
# KDS (Kitchen Display System) Endpoints
# -------------------------------------------------------------

@router.get("/{slug}/kds/orders")
async def get_kds_orders(
    slug: str,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Public/Tablet endpoint for Kitchen Display System (KDS).
    Checks if KDS is enabled in restaurant UI config and returns live kitchen orders.
    """
    restaurant = await find_restaurant_by_slug(slug, db)
    if not restaurant:
        raise HTTPException(status_code=404, detail="Ресторан не найден")

    modules = restaurant.enabled_modules
    if modules is None:
        modules = DEFAULT_MODULES
    if ModuleAccess.KDS not in modules:
        return {
            "kds_enabled": False,
            "message": "Модуль KDS не активирован в тарифном плане данного заведения",
            "orders": []
        }

    ui_cfg = restaurant.ui_config or {}
    kds_cfg = ui_cfg.get("kds", {})
    kds_enabled = bool(kds_cfg.get("enable_kds_system", False))

    if not kds_enabled:
        return {
            "kds_enabled": False,
            "message": "Модуль KDS выключен в настройках заведения",
            "orders": []
        }

    query = select(ServiceRequest).where(
        ServiceRequest.restaurant_id == restaurant.id,
        ServiceRequest.request_type.in_(["order", "repeat_order"])
    )
    if status:
        query = query.where(ServiceRequest.status == status)
    else:
        query = query.where(ServiceRequest.status.in_(["PENDING", "COOKING", "READY"]))

    query = query.order_by(ServiceRequest.created_at.asc())
    res = await db.execute(query)
    orders = res.scalars().all()

    return {
        "kds_enabled": True,
        "restaurant_name": restaurant.name,
        "kds_config": kds_cfg,
        "orders": [
            {
                "id": o.id,
                "table_number": o.table_number,
                "request_type": o.request_type,
                "guest_comment": o.guest_comment,
                "cart_items": o.cart_items or [],
                "status": o.status,
                "total_amount": o.total_amount,
                "currency": o.currency,
                "created_at": o.created_at.isoformat() if o.created_at else None
            }
            for o in orders
        ]
    }


@router.patch("/{slug}/kds/orders/{req_id}/status")
async def update_kds_order_status(
    slug: str,
    req_id: int,
    payload: dict,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Kitchen tablet endpoint to update whole order status (COOKING, READY, COMPLETED).
    Sends immediate alert to waiters via Telegram when dishes are ready at pickup counter.
    """
    restaurant = await find_restaurant_by_slug(slug, db)
    if not restaurant:
        raise HTTPException(status_code=404, detail="Ресторан не найден")

    require_module(restaurant, ModuleAccess.KDS)

    req = await db.get(ServiceRequest, req_id)
    if not req or req.restaurant_id != restaurant.id:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    new_status = payload.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="status обязателен")

    req.status = new_status
    if payload.get("chef_name"):
        req.acknowledged_by = payload["chef_name"]

    await db.commit()
    await db.refresh(req)

    # Check if we should notify waiters via Telegram
    ui_cfg = restaurant.ui_config or {}
    kds_cfg = ui_cfg.get("kds", {})
    should_notify = kds_cfg.get("notify_waiter_on_ready", True)

    if (new_status in ["READY", "COMPLETED"]) and should_notify and restaurant.telegram_enabled and restaurant.telegram_bot_token and restaurant.telegram_chat_id:
        cooking_mins = None
        if req.created_at:
            from datetime import datetime
            diff = (datetime.utcnow() - req.created_at).total_seconds()
            cooking_mins = max(1, int(diff / 60))

        items_count = len(req.cart_items) if req.cart_items else 1
        background_tasks.add_task(
            TelegramService.notify_order_ready,
            bot_token=restaurant.telegram_bot_token,
            chat_id=restaurant.telegram_chat_id,
            restaurant_name=restaurant.name,
            table_number=req.table_number,
            item_name=None,
            department="Раздача шефа",
            cooking_minutes=cooking_mins,
            items_count=items_count,
            order_id=req.id
        )

    return {
        "status": "success",
        "id": req.id,
        "new_status": req.status
    }


@router.patch("/{slug}/kds/orders/{req_id}/items/{item_idx}")
async def update_kds_item_status(
    slug: str,
    req_id: int,
    item_idx: int,
    payload: dict,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Toggle individual cart item status (COOKING <-> READY) on the kitchen station.
    """
    restaurant = await find_restaurant_by_slug(slug, db)
    if not restaurant:
        raise HTTPException(status_code=404, detail="Ресторан не найден")

    require_module(restaurant, ModuleAccess.KDS)

    req = await db.get(ServiceRequest, req_id)
    if not req or req.restaurant_id != restaurant.id:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    items = list(req.cart_items or [])
    if item_idx < 0 or item_idx >= len(items):
        raise HTTPException(status_code=400, detail="Неверный индекс позиции")

    new_item_status = payload.get("status", "READY")
    items[item_idx] = {**items[item_idx], "status": new_item_status}
    req.cart_items = items
    flag_modified(req, "cart_items")

    await db.commit()
    await db.refresh(req)

    # Optional Telegram push for individual ready item
    ui_cfg = restaurant.ui_config or {}
    kds_cfg = ui_cfg.get("kds", {})
    if new_item_status == "READY" and kds_cfg.get("notify_waiter_on_ready", True) and restaurant.telegram_enabled and restaurant.telegram_bot_token and restaurant.telegram_chat_id:
        dish_name = items[item_idx].get("name", "Блюдо")
        background_tasks.add_task(
            TelegramService.notify_order_ready,
            bot_token=restaurant.telegram_bot_token,
            chat_id=restaurant.telegram_chat_id,
            restaurant_name=restaurant.name,
            table_number=req.table_number,
            item_name=dish_name,
            department=items[item_idx].get("course") or "Цех кухни",
            cooking_minutes=None,
            items_count=1,
            order_id=req.id
        )

    return {
        "status": "success",
        "order_id": req.id,
        "item_index": item_idx,
        "item_status": new_item_status,
        "cart_items": req.cart_items
    }

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
        .options(selectinload(Category.dishes).selectinload(Dish.media))
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
            cloned_media_id = None
            if d_dish.media:
                cloned_media = MediaAsset(
                    status=d_dish.media.status or "READY",
                    original_filename=d_dish.media.original_filename,
                    original_url=d_dish.media.original_url,
                    poster_lqip_url=d_dish.media.poster_lqip_url,
                    poster_hd_url=d_dish.media.poster_hd_url,
                    video_mobile_url=d_dish.media.video_mobile_url,
                    video_kiosk_url=d_dish.media.video_kiosk_url,
                    duration_seconds=d_dish.media.duration_seconds,
                    file_size_bytes=d_dish.media.file_size_bytes
                )
                db.add(cloned_media)
                await db.flush()
                cloned_media_id = cloned_media.id

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
                media_id=cloned_media_id,
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
