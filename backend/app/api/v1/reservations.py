import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_admin, check_restaurant_access
from app.models.restaurant import Restaurant
from app.models.reservation import TableReservation, DiningTable, TableZone
from app.services.reservation_service import ReservationService
from app.services.telegram_service import TelegramService
from app.core.licensing import require_module, ModuleAccess

logger = logging.getLogger("video_menu.reservations")

router = APIRouter(prefix="/reservations", tags=["Table Reservations"])

async def get_restaurant_by_slug(slug: str, db: AsyncSession) -> Restaurant:
    query = select(Restaurant).where(Restaurant.slug == slug)
    res = await db.execute(query)
    restaurant = res.scalar_one_or_none()
    if not restaurant:
        # Check historic slugs
        all_res = await db.execute(select(Restaurant))
        for r in all_res.scalars().all():
            if slug in (r.old_slugs or []):
                return r
        raise HTTPException(status_code=404, detail="Ресторан не найден")
    return restaurant


@router.get("/zones")
async def get_zones_and_tables(
    restaurant_slug: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Публичный эндпоинт: возвращает зоны заведения и список столов
    для интерактивного выбора или отображения карты зала.
    """
    restaurant = await get_restaurant_by_slug(restaurant_slug, db)
    require_module(restaurant, ModuleAccess.RESERVATIONS)
    
    query = select(TableZone).where(
        TableZone.restaurant_id == restaurant.id,
        TableZone.is_active == True
    ).order_by(TableZone.display_order.asc()).options(selectinload(TableZone.tables))
    
    res = await db.execute(query)
    zones = res.scalars().all()
    
    return [
        {
            "id": z.id,
            "name": z.name,
            "description": z.description,
            "image_url": z.image_url,
            "floor": getattr(z, "floor", 1) or 1,
            "display_order": z.display_order,
            "is_active": z.is_active,
            "tables": [
                {
                    "id": t.id,
                    "zone_id": t.zone_id,
                    "table_number": t.table_number,
                    "min_capacity": t.min_capacity,
                    "max_capacity": t.max_capacity,
                    "pos_x": t.pos_x,
                    "pos_y": t.pos_y,
                    "shape": t.shape,
                    "photo_url": t.photo_url,
                    "features": t.features or [],
                    "is_active": t.is_active
                }
                for t in z.tables if t.is_active
            ]
        }
        for z in zones
    ]


@router.get("/slots")
async def get_slots(
    restaurant_slug: str,
    date: str,
    guests: int = 2,
    zone_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Публичный эндпоинт: отдает доступные слоты времени для гостя,
    с учетом вместимости столов, защиты от овербукинга и pacing кухни.
    """
    restaurant = await get_restaurant_by_slug(restaurant_slug, db)

    # Валидация формата даты YYYY-MM-DD
    try:
        datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Неверный формат даты, ожидается YYYY-MM-DD")

    ui_cfg = restaurant.ui_config or {}
    kitchen_pacing = ui_cfg.get("kitchen_pacing") or {}
    enable_pacing = kitchen_pacing.get("enable_kitchen_pacing", True)
    max_pacing_tables = int(kitchen_pacing.get("max_pacing_tables_per_slot", 3))

    slots = await ReservationService.get_available_slots(
        db, restaurant.id, date, guests, zone_id,
        enable_pacing=enable_pacing,
        max_pacing_tables=max_pacing_tables
    )

    # Список доступных зон с фото и столами для интерактивного плана
    z_res = await db.execute(
        select(TableZone).where(
            TableZone.restaurant_id == restaurant.id,
            TableZone.is_active == True
        ).order_by(TableZone.display_order.asc()).options(selectinload(TableZone.tables))
    )
    zones = [
        {
            "id": z.id,
            "name": z.name,
            "description": z.description,
            "image_url": z.image_url,
            "floor": getattr(z, "floor", 1) or 1,
            "tables": [
                {
                    "id": t.id,
                    "zone_id": t.zone_id,
                    "table_number": t.table_number,
                    "min_capacity": t.min_capacity,
                    "max_capacity": t.max_capacity,
                    "pos_x": t.pos_x,
                    "pos_y": t.pos_y,
                    "shape": t.shape,
                    "photo_url": t.photo_url,
                    "features": t.features or []
                }
                for t in z.tables if t.is_active
            ]
        }
        for z in z_res.scalars().all()
    ]

    return {
        "date": date,
        "guests": guests,
        "slots": slots,
        "zones": zones
    }


@router.post("")
async def create_reservation(
    payload: dict,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Создание бронирования стола гостем (со смартфона, QR-меню или уличного киоска).
    Автоматически назначает стол без коллизий и отправляет пуш хостес в Telegram.
    """
    slug = payload.get("restaurant_slug")
    if not slug:
        raise HTTPException(status_code=400, detail="restaurant_slug обязателен")

    restaurant = await get_restaurant_by_slug(slug, db)
    require_module(restaurant, ModuleAccess.RESERVATIONS)

    guest_name = (payload.get("guest_name") or "").strip()
    guest_phone = (payload.get("guest_phone") or "").strip()
    if not guest_name or len(guest_phone) < 6:
        raise HTTPException(status_code=400, detail="Укажите корректное имя и номер телефона")

    date_str = payload.get("reservation_date")
    start_time = payload.get("start_time")
    if not date_str or not start_time:
        raise HTTPException(status_code=400, detail="reservation_date и start_time обязательны")

    try:
        datetime.strptime(date_str, "%Y-%m-%d")
        start_dt = datetime.strptime(start_time, "%H:%M")
    except ValueError:
        raise HTTPException(status_code=400, detail="Некорректный формат даты или времени")

    guests_count = int(payload.get("guests_count", 2))
    turnover_minutes = ReservationService.get_turnover_duration(guests_count)
    end_time = (start_dt + timedelta(minutes=turnover_minutes)).strftime("%H:%M")

    raw_zone = payload.get("zone_id")
    zone_id = int(raw_zone) if raw_zone is not None and str(raw_zone).isdigit() else None
    raw_table = payload.get("table_id")
    preferred_table_id = int(raw_table) if raw_table is not None and str(raw_table).isdigit() else None

    # Умный подбор свободного стола с защитой от пересечений
    assigned_table = await ReservationService.assign_table_for_booking(
        db=db,
        restaurant_id=restaurant.id,
        date_str=date_str,
        start_time=start_time,
        end_time=end_time,
        guests_count=guests_count,
        zone_id=zone_id,
        preferred_table_id=preferred_table_id
    )

    if not assigned_table and preferred_table_id:
        # Если запрошенный стол занят, попробуем любой другой подходящий
        assigned_table = await ReservationService.assign_table_for_booking(
            db=db,
            restaurant_id=restaurant.id,
            date_str=date_str,
            start_time=start_time,
            end_time=end_time,
            guests_count=guests_count,
            zone_id=zone_id,
            preferred_table_id=None
        )

    code = ReservationService.generate_booking_code()

    reservation = TableReservation(
        booking_code=code,
        restaurant_id=restaurant.id,
        table_id=assigned_table.id if assigned_table else None,
        zone_id=zone_id or (assigned_table.zone_id if assigned_table else None),
        guest_name=guest_name,
        guest_phone=guest_phone,
        guest_email=payload.get("guest_email"),
        guests_count=guests_count,
        reservation_date=date_str,
        start_time=start_time,
        end_time=end_time,
        duration_minutes=turnover_minutes,
        source=payload.get("source", "MOBILE_QR"),
        guest_wishes=payload.get("guest_wishes"),
        status="PENDING"
    )
    db.add(reservation)
    await db.commit()
    await db.refresh(reservation)

    # Имя зоны и номер стола для уведомления
    zone_name = None
    if reservation.zone_id:
        z = await db.get(TableZone, reservation.zone_id)
        if z:
            floor_str = f"{getattr(z, 'floor', 1)}-й этаж, " if getattr(z, "floor", None) else ""
            zone_name = f"{floor_str}{z.name}"

    # Мгновенная диспетчеризация в Telegram хостес
    if restaurant.telegram_enabled and restaurant.telegram_bot_token and restaurant.telegram_chat_id:
        background_tasks.add_task(
            TelegramService.notify_reservation,
            bot_token=restaurant.telegram_bot_token,
            chat_id=restaurant.telegram_chat_id,
            restaurant_name=restaurant.name,
            booking_code=code,
            guest_name=guest_name,
            guest_phone=guest_phone,
            guests_count=guests_count,
            reservation_date=date_str,
            start_time=start_time,
            end_time=end_time,
            table_number=assigned_table.table_number if assigned_table else None,
            zone_name=zone_name,
            guest_wishes=reservation.guest_wishes,
            source=reservation.source,
            reservation_id=reservation.id
        )

    return {
        "status": "success",
        "booking_code": code,
        "id": reservation.id,
        "start_time": reservation.start_time,
        "end_time": reservation.end_time,
        "duration_minutes": turnover_minutes,
        "table_number": assigned_table.table_number if assigned_table else None,
        "zone_name": zone_name,
        "message": "Стол успешно забронирован! Ожидайте звонка или сообщения от хостес."
    }


@router.get("/admin/list")
async def admin_list_reservations(
    restaurant_slug: str,
    date: Optional[str] = None,
    status: Optional[str] = None,
    current_admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Список броней для панели хостес и управляющего (Журнал & Шахматка).
    """
    restaurant = await get_restaurant_by_slug(restaurant_slug, db)
    check_restaurant_access(current_admin, restaurant.id)

    query = select(TableReservation).where(TableReservation.restaurant_id == restaurant.id)
    if date:
        query = query.where(TableReservation.reservation_date == date)
    if status and status != "ALL":
        query = query.where(TableReservation.status == status)

    query = query.order_by(TableReservation.start_time.asc())
    res = await db.execute(query)
    items = res.scalars().all()

    # Собираем столы и зоны для вывода человекочитаемых номеров
    tables_res = await db.execute(select(DiningTable).where(DiningTable.restaurant_id == restaurant.id))
    tables_map = {t.id: t.table_number for t in tables_res.scalars().all()}

    zones_res = await db.execute(select(TableZone).where(TableZone.restaurant_id == restaurant.id))
    zones_map = {z.id: z.name for z in zones_res.scalars().all()}

    return [
        {
            "id": r.id,
            "booking_code": r.booking_code,
            "guest_name": r.guest_name,
            "guest_phone": r.guest_phone,
            "guest_email": r.guest_email,
            "guests_count": r.guests_count,
            "reservation_date": r.reservation_date,
            "start_time": r.start_time,
            "end_time": r.end_time,
            "duration_minutes": r.duration_minutes,
            "status": r.status,
            "table_id": r.table_id,
            "table_number": tables_map.get(r.table_id),
            "zone_id": r.zone_id,
            "zone_name": zones_map.get(r.zone_id),
            "guest_wishes": r.guest_wishes,
            "admin_notes": r.admin_notes,
            "source": r.source,
            "created_at": r.created_at.isoformat() if r.created_at else None
        }
        for r in items
    ]


@router.patch("/{reservation_id}/status")
async def update_reservation_status(
    reservation_id: int,
    payload: dict,
    current_admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    1-Click смена статуса бронирования хостес:
    PENDING, CONFIRMED, SEATED, COMPLETED, CANCELLED, NO_SHOW
    """
    bk = await db.get(TableReservation, reservation_id)
    if not bk:
        raise HTTPException(status_code=404, detail="Бронь не найдена")

    check_restaurant_access(current_admin, bk.restaurant_id)

    new_status = payload.get("status")
    allowed_statuses = ["PENDING", "CONFIRMED", "SEATED", "COMPLETED", "CANCELLED", "NO_SHOW"]
    if new_status:
        if new_status not in allowed_statuses:
            raise HTTPException(status_code=400, detail=f"Недопустимый статус: {new_status}")
        bk.status = new_status

    if "table_id" in payload:
        bk.table_id = payload["table_id"]
    if "admin_notes" in payload:
        bk.admin_notes = payload["admin_notes"]

    await db.commit()
    await db.refresh(bk)
    return {
        "status": "success",
        "id": bk.id,
        "new_status": bk.status,
        "table_id": bk.table_id,
        "admin_notes": bk.admin_notes
    }


# -------------------------------------------------------------
# Admin CRUD: Table Zones & Physical Dining Tables
# -------------------------------------------------------------

@router.post("/admin/zones")
async def create_zone(
    payload: dict,
    current_admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Создание новой зоны / зала в ресторане"""
    slug = payload.get("restaurant_slug")
    if not slug:
        raise HTTPException(status_code=400, detail="restaurant_slug обязателен")
    
    restaurant = await get_restaurant_by_slug(slug, db)
    check_restaurant_access(current_admin, restaurant.id)

    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Укажите название зоны")

    zone = TableZone(
        restaurant_id=restaurant.id,
        name=name,
        description=payload.get("description"),
        image_url=payload.get("image_url"),
        floor=int(payload.get("floor", 1)),
        display_order=int(payload.get("display_order", 0)),
        is_active=bool(payload.get("is_active", True))
    )
    db.add(zone)
    await db.commit()
    await db.refresh(zone)
    return {
        "status": "success",
        "zone": {
            "id": zone.id,
            "name": zone.name,
            "description": zone.description,
            "image_url": zone.image_url,
            "floor": getattr(zone, "floor", 1) or 1,
            "display_order": zone.display_order,
            "is_active": zone.is_active
        }
    }


@router.put("/admin/zones/{zone_id}")
async def update_zone(
    zone_id: int,
    payload: dict,
    current_admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Обновление параметров зоны"""
    zone = await db.get(TableZone, zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail="Зона не найдена")

    check_restaurant_access(current_admin, zone.restaurant_id)

    if "name" in payload and payload["name"].strip():
        zone.name = payload["name"].strip()
    if "description" in payload:
        zone.description = payload["description"]
    if "image_url" in payload:
        zone.image_url = payload["image_url"]
    if "floor" in payload:
        zone.floor = int(payload["floor"])
    if "display_order" in payload:
        zone.display_order = int(payload["display_order"])
    if "is_active" in payload:
        zone.is_active = bool(payload["is_active"])

    await db.commit()
    await db.refresh(zone)
    return {
        "status": "success",
        "zone": {
            "id": zone.id,
            "name": zone.name,
            "description": zone.description,
            "image_url": zone.image_url,
            "floor": getattr(zone, "floor", 1) or 1,
            "display_order": zone.display_order,
            "is_active": zone.is_active
        }
    }


@router.delete("/admin/zones/{zone_id}")
async def delete_zone(
    zone_id: int,
    current_admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Удаление зоны со всеми столами"""
    zone = await db.get(TableZone, zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail="Зона не найдена")

    check_restaurant_access(current_admin, zone.restaurant_id)

    await db.delete(zone)
    await db.commit()
    return {"status": "success", "deleted_zone_id": zone_id}


@router.post("/admin/tables")
async def create_table(
    payload: dict,
    current_admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Создание физического стола в ресторане"""
    slug = payload.get("restaurant_slug")
    if not slug:
        raise HTTPException(status_code=400, detail="restaurant_slug обязателен")
    
    restaurant = await get_restaurant_by_slug(slug, db)
    check_restaurant_access(current_admin, restaurant.id)

    table_number = str(payload.get("table_number") or "").strip()
    if not table_number:
        raise HTTPException(status_code=400, detail="Укажите номер или название стола")

    zone_id = payload.get("zone_id")
    if not zone_id:
        raise HTTPException(status_code=400, detail="zone_id обязателен")

    # Проверка, что зона принадлежит этому ресторану
    zone = await db.get(TableZone, zone_id)
    if not zone or zone.restaurant_id != restaurant.id:
        raise HTTPException(status_code=400, detail="Указанная зона не найдена в этом заведении")

    table = DiningTable(
        restaurant_id=restaurant.id,
        zone_id=zone_id,
        table_number=table_number,
        min_capacity=max(1, int(payload.get("min_capacity", 1))),
        max_capacity=max(1, int(payload.get("max_capacity", 4))),
        shape=payload.get("shape", "square"),
        pos_x=float(payload.get("pos_x", 50.0)),
        pos_y=float(payload.get("pos_y", 50.0)),
        photo_url=payload.get("photo_url"),
        features=payload.get("features") or [],
        is_active=bool(payload.get("is_active", True))
    )
    db.add(table)
    await db.commit()
    await db.refresh(table)
    return {
        "status": "success",
        "table": {
            "id": table.id,
            "table_number": table.table_number,
            "min_capacity": table.min_capacity,
            "max_capacity": table.max_capacity,
            "shape": table.shape,
            "zone_id": table.zone_id,
            "pos_x": table.pos_x,
            "pos_y": table.pos_y,
            "photo_url": table.photo_url,
            "features": table.features or [],
            "is_active": table.is_active
        }
    }


@router.put("/admin/tables/{table_id}")
async def update_table(
    table_id: int,
    payload: dict,
    current_admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Обновление параметров стола (вместимость, номер, активность, координаты, фичи)"""
    table = await db.get(DiningTable, table_id)
    if not table:
        raise HTTPException(status_code=404, detail="Стол не найден")

    check_restaurant_access(current_admin, table.restaurant_id)

    if "table_number" in payload and str(payload["table_number"]).strip():
        table.table_number = str(payload["table_number"]).strip()
    if "zone_id" in payload:
        table.zone_id = int(payload["zone_id"])
    if "min_capacity" in payload:
        table.min_capacity = max(1, int(payload["min_capacity"]))
    if "max_capacity" in payload:
        table.max_capacity = max(1, int(payload["max_capacity"]))
    if "shape" in payload:
        table.shape = payload["shape"]
    if "is_active" in payload:
        table.is_active = bool(payload["is_active"])
    if "pos_x" in payload:
        table.pos_x = float(payload["pos_x"])
    if "pos_y" in payload:
        table.pos_y = float(payload["pos_y"])
    if "photo_url" in payload:
        table.photo_url = payload["photo_url"]
    if "features" in payload:
        table.features = payload["features"]

    await db.commit()
    await db.refresh(table)
    return {
        "status": "success",
        "table": {
            "id": table.id,
            "table_number": table.table_number,
            "is_active": table.is_active,
            "min_capacity": table.min_capacity,
            "max_capacity": table.max_capacity,
            "shape": table.shape,
            "zone_id": table.zone_id,
            "pos_x": table.pos_x,
            "pos_y": table.pos_y,
            "photo_url": table.photo_url,
            "features": table.features or []
        }
    }


@router.delete("/admin/tables/{table_id}")
async def delete_table(
    table_id: int,
    current_admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Удаление физического стола"""
    table = await db.get(DiningTable, table_id)
    if not table:
        raise HTTPException(status_code=404, detail="Стол не найден")

    check_restaurant_access(current_admin, table.restaurant_id)

    await db.delete(table)
    await db.commit()
    return {"status": "success", "deleted_table_id": table_id}

