import shutil
import aiofiles
from pathlib import Path
from fastapi import UploadFile
from app.core.config import settings

from fastapi import HTTPException

class StorageService:
    @staticmethod
    async def save_uploaded_file(upload_file: UploadFile, destination_path: Path, max_size_mb: int = 150) -> int:
        destination_path.parent.mkdir(parents=True, exist_ok=True)
        max_bytes = max_size_mb * 1024 * 1024
        size = 0
        try:
            async with aiofiles.open(destination_path, "wb") as out_file:
                while content := await upload_file.read(1024 * 1024):  # 1MB chunks
                    size += len(content)
                    if size > max_bytes:
                        raise HTTPException(
                            status_code=413,
                            detail=f"Файл превышает допустимый лимит ({max_size_mb} МБ). Пожалуйста, оптимизируйте видео."
                        )
                    await out_file.write(content)
            return size
        except Exception:
            if destination_path.exists():
                destination_path.unlink()
            raise

    @staticmethod
    def cleanup_file(file_path: Path):
        try:
            if file_path.exists():
                file_path.unlink()
        except Exception:
            pass

    @staticmethod
    def cleanup_expired_tmp_files(directory: Path, max_age_seconds: int = 3600) -> int:
        """Removes temporary files older than max_age_seconds (default 1 hour)."""
        import time
        deleted_count = 0
        try:
            if not directory.exists():
                return 0
            now = time.time()
            for item in directory.glob("*"):
                if item.is_file():
                    try:
                        if now - item.stat().st_mtime > max_age_seconds:
                            item.unlink()
                            deleted_count += 1
                    except Exception:
                        pass
        except Exception:
            pass
        return deleted_count
