import os
import uuid
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.models.dish import Dish
from app.models.media import MediaAsset
from app.models.category import Category
from app.schemas.dish import DishCreate, DishUpdate, DishResponse, DishReorderItem
from app.services.storage_service import StorageService
from app.workers.video_tasks import transcode_video_task

router = APIRouter(prefix="/dishes", tags=["Dishes"])

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".webm", ".mkv", ".avi"}

@router.get("", response_model=List[DishResponse])
async def list_dishes(
    restaurant_id: Optional[int] = None,
    category_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(Dish).options(selectinload(Dish.media)).order_by(Dish.display_order)
    if restaurant_id:
        query = query.where(Dish.restaurant_id == restaurant_id)
    if category_id:
        query = query.where(Dish.category_id == category_id)
    
    result = await db.execute(query)
    dishes = result.scalars().all()
    
    # Format response with media
    response = []
    for d in dishes:
        media_info = None
        if d.media:
            media_info = {
                "id": d.media.id,
                "status": d.media.status,
                "lqip": d.media.poster_lqip_url,
                "poster": d.media.poster_hd_url,
                "video_mobile": d.media.video_mobile_url,
                "video_kiosk": d.media.video_kiosk_url,
                "duration_seconds": d.media.duration_seconds
            }
        
        response.append(DishResponse(
            id=d.id,
            restaurant_id=d.restaurant_id,
            category_id=d.category_id,
            name_translations=d.name_translations,
            description_translations=d.description_translations,
            weight_info=d.weight_info,
            calories_info=d.calories_info,
            allergens=d.allergens,
            price=float(d.price),
            currency=d.currency,
            is_available=d.is_available,
            is_featured=d.is_featured,
            display_order=d.display_order,
            media_id=d.media_id,
            media=media_info,
            created_at=d.created_at
        ))
    return response

@router.post("", response_model=DishResponse)
async def create_dish(data: DishCreate, db: AsyncSession = Depends(get_db)):
    # Verify category
    cat = await db.get(Category, data.category_id)
    if not cat:
        raise HTTPException(status_code=400, detail="Указанная категория не найдена")

    dish_dict = data.model_dump()
    dish = Dish(**dish_dict)
    db.add(dish)
    await db.commit()
    await db.refresh(dish)

    # Re-fetch with media if present
    result = await db.execute(
        select(Dish).where(Dish.id == dish.id).options(selectinload(Dish.media))
    )
    d = result.scalar_one()

    media_info = None
    if d.media:
        media_info = {
            "id": d.media.id,
            "status": d.media.status,
            "lqip": d.media.poster_lqip_url,
            "poster": d.media.poster_hd_url,
            "video_mobile": d.media.video_mobile_url,
            "video_kiosk": d.media.video_kiosk_url,
            "duration_seconds": d.media.duration_seconds
        }

    return DishResponse(
        id=d.id,
        restaurant_id=d.restaurant_id,
        category_id=d.category_id,
        name_translations=d.name_translations,
        description_translations=d.description_translations,
        weight_info=d.weight_info,
        calories_info=d.calories_info,
        allergens=d.allergens,
        price=float(d.price),
        currency=d.currency,
        is_available=d.is_available,
        is_featured=d.is_featured,
        display_order=d.display_order,
        media_id=d.media_id,
        media=media_info,
        created_at=d.created_at
    )

@router.put("/{dish_id}", response_model=DishResponse)
async def update_dish(
    dish_id: int, 
    data: DishUpdate, 
    db: AsyncSession = Depends(get_db)
):
    dish = await db.get(Dish, dish_id)
    if not dish:
        raise HTTPException(status_code=404, detail="Блюдо не найдено")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(dish, key, value)

    await db.commit()
    await db.refresh(dish)

    result = await db.execute(
        select(Dish).where(Dish.id == dish.id).options(selectinload(Dish.media))
    )
    d = result.scalar_one()

    media_info = None
    if d.media:
        media_info = {
            "id": d.media.id,
            "status": d.media.status,
            "lqip": d.media.poster_lqip_url,
            "poster": d.media.poster_hd_url,
            "video_mobile": d.media.video_mobile_url,
            "video_kiosk": d.media.video_kiosk_url,
            "duration_seconds": d.media.duration_seconds
        }

    return DishResponse(
        id=d.id,
        restaurant_id=d.restaurant_id,
        category_id=d.category_id,
        name_translations=d.name_translations,
        description_translations=d.description_translations,
        weight_info=d.weight_info,
        calories_info=d.calories_info,
        allergens=d.allergens,
        price=float(d.price),
        currency=d.currency,
        is_available=d.is_available,
        is_featured=d.is_featured,
        display_order=d.display_order,
        media_id=d.media_id,
        media=media_info,
        created_at=d.created_at
    )

@router.delete("/{dish_id}")
async def delete_dish(dish_id: int, db: AsyncSession = Depends(get_db)):
    dish = await db.get(Dish, dish_id)
    if not dish:
        raise HTTPException(status_code=404, detail="Блюдо не найдено")

    await db.delete(dish)
    await db.commit()
    return {"status": "deleted", "id": dish_id}

@router.patch("/{dish_id}/toggle-stop-list")
async def toggle_stop_list(dish_id: int, db: AsyncSession = Depends(get_db)):
    """
    1-click instant stop-list toggle.
    Reflects immediately on Mobile Guest and Street Kiosk screens.
    """
    dish = await db.get(Dish, dish_id)
    if not dish:
        raise HTTPException(status_code=404, detail="Блюдо не найдено")

    dish.is_available = not dish.is_available
    await db.commit()
    return {
        "id": dish.id, 
        "name": dish.name_translations, 
        "is_available": dish.is_available
    }

@router.post("/reorder")
async def reorder_dishes(
    items: List[DishReorderItem] = Body(...),
    db: AsyncSession = Depends(get_db)
):
    for item in items:
        dish = await db.get(Dish, item.id)
        if dish:
            dish.display_order = item.display_order
    await db.commit()
    return {"status": "reordered"}

@router.post("/upload-video")
async def upload_dish_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Receives raw video (.mp4, .mov, .webm, .mkv, .avi) from smartphone / DSLR,
    stores in temp storage, creates MediaAsset in PROCESSING state,
    and dispatches background FFmpeg transcoding.
    """
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"Неподдерживаемый формат: {ext}. Разрешены: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Save to temp
    unique_name = f"{uuid.uuid4().hex}_{file.filename}"
    temp_path = settings.TMP_DIR / unique_name
    await StorageService.save_uploaded_file(file, temp_path)

    # Create media asset
    media = MediaAsset(
        original_filename=file.filename,
        original_url=str(temp_path),
        status="PROCESSING"
    )
    db.add(media)
    await db.commit()
    await db.refresh(media)

    # Launch background transcoder
    background_tasks.add_task(transcode_video_task, media.id, str(temp_path))

    return {
        "media_id": media.id,
        "status": "PROCESSING",
        "filename": file.filename,
        "message": "Видео принято на обработку. Генерация WebP LQIP и H.264/WebM выполняется в фоне."
    }
