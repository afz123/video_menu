from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.core.database import get_db
from app.models.media import MediaAsset

router = APIRouter(prefix="/media", tags=["Media"])

@router.get("/{media_id}")
async def get_media_status(media_id: int, db: AsyncSession = Depends(get_db)):
    media = await db.get(MediaAsset, media_id)
    if not media:
        raise HTTPException(status_code=404, detail="Медиа-ассет не найден")

    return {
        "id": media.id,
        "status": media.status,
        "original_filename": media.original_filename,
        "lqip": media.poster_lqip_url,
        "poster": media.poster_hd_url,
        "video_mobile": media.video_mobile_url,
        "video_kiosk": media.video_kiosk_url,
        "file_size_bytes": media.file_size_bytes,
        "error_message": media.error_message
    }

@router.get("")
async def list_media_assets(limit: int = 50, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MediaAsset).order_by(MediaAsset.id.desc()).limit(limit))
    items = result.scalars().all()
    return [{
        "id": m.id,
        "status": m.status,
        "original_filename": m.original_filename,
        "lqip": m.poster_lqip_url,
        "poster": m.poster_hd_url,
        "video_mobile": m.video_mobile_url,
        "video_kiosk": m.video_kiosk_url
    } for m in items]
