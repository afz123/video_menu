import asyncio
import logging
import os
from typing import Optional, Dict, Any
from pathlib import Path
from app.core.config import settings
from app.core.database import get_session
from app.models.media import MediaAsset
from app.services.video_transcoder import VideoTranscodeService
from app.services.storage_service import StorageService

logger = logging.getLogger("video_menu.worker")

# Concurrency semaphore limiting parallel FFmpeg tasks to avoid CPU spikes and OOM
TRANSCODE_SEMAPHORE = asyncio.Semaphore(2)

async def update_asset_metadata(asset_id: int, urls: Optional[Dict[str, Any]], error_msg: Optional[str] = None):
    """
    Acquires an isolated DB session strictly after FFmpeg completion for < 5ms
    to prevent connection pool exhaustion during long-running video transcoding.
    """
    session = await get_session()
    async with session as db:
        async with db.begin():
            asset = await db.get(MediaAsset, asset_id)
            if asset:
                if urls:
                    asset.poster_lqip_url = urls.get("poster_lqip")
                    asset.poster_hd_url = urls.get("poster_hd")
                    asset.video_mobile_url = urls.get("video_mobile")
                    asset.video_kiosk_url = urls.get("video_kiosk")
                    asset.file_size_bytes = urls.get("file_size_bytes")
                    asset.status = "READY"
                    logger.info(f"Asset {asset_id} successfully converted and marked READY")
                else:
                    asset.status = "FAILED"
                    asset.error_message = error_msg
                    logger.warning(f"Asset {asset_id} marked FAILED: {error_msg}")


async def transcode_video_task(asset_id: int, temp_file_path_str: str, is_image: bool = False):
    temp_path = Path(temp_file_path_str)
    
    # Auto-detect if image based on suffix
    image_exts = {".jpg", ".jpeg", ".png", ".webp", ".heic"}
    if temp_path.suffix.lower() in image_exts:
        is_image = True

    async with TRANSCODE_SEMAPHORE:
        urls = None
        error_msg = None
        try:
            if not temp_path.exists() or temp_path.stat().st_size == 0:
                raise ValueError("Загруженный файл пуст (0 байт) или повреждён.")

            logger.info(f"Worker started processing asset {asset_id} (is_image={is_image})...")
            if is_image:
                urls = await VideoTranscodeService.process_image(
                    input_path=str(temp_path),
                    output_dir=settings.VIDEOS_DIR,
                    asset_id=asset_id
                )
            else:
                urls = await VideoTranscodeService.process_video(
                    input_path=str(temp_path),
                    output_dir=settings.VIDEOS_DIR,
                    asset_id=asset_id
                )
        except Exception as e:
            logger.error(f"Error processing asset {asset_id}: {e}", exc_info=True)
            error_msg = str(e)

        # 2. DB session is acquired strictly after heavy transcode finishes (< 5ms write lock)
        await update_asset_metadata(asset_id, urls, error_msg)

        StorageService.cleanup_file(temp_path)
