import logging
from pathlib import Path
from app.core.config import settings
from app.core.database import get_session
from app.models.media import MediaAsset
from app.services.video_transcoder import VideoTranscodeService
from app.services.storage_service import StorageService

logger = logging.getLogger("video_menu.worker")

async def transcode_video_task(asset_id: int, temp_file_path_str: str, is_image: bool = False):
    temp_path = Path(temp_file_path_str)
    
    # Auto-detect if image based on suffix
    image_exts = {".jpg", ".jpeg", ".png", ".webp", ".heic"}
    if temp_path.suffix.lower() in image_exts:
        is_image = True

    session = await get_session()
    async with session as db:
        try:
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
            
            asset = await db.get(MediaAsset, asset_id)
            if asset:
                asset.poster_lqip_url = urls["poster_lqip"]
                asset.poster_hd_url = urls["poster_hd"]
                asset.video_mobile_url = urls["video_mobile"]
                asset.video_kiosk_url = urls["video_kiosk"]
                asset.file_size_bytes = urls["file_size_bytes"]
                asset.status = "READY"
                await db.commit()
                logger.info(f"Asset {asset_id} successfully converted and marked READY")
        except Exception as e:
            logger.error(f"Error processing asset {asset_id}: {e}", exc_info=True)
            asset = await db.get(MediaAsset, asset_id)
            if asset:
                asset.status = "FAILED"
                asset.error_message = str(e)
                await db.commit()
        finally:
            StorageService.cleanup_file(temp_path)
