import shutil
import aiofiles
from pathlib import Path
from fastapi import UploadFile
from app.core.config import settings

class StorageService:
    @staticmethod
    async def save_uploaded_file(upload_file: UploadFile, destination_path: Path) -> int:
        destination_path.parent.mkdir(parents=True, exist_ok=True)
        size = 0
        async with aiofiles.open(destination_path, "wb") as out_file:
            while content := await upload_file.read(1024 * 1024):  # 1MB chunks
                size += len(content)
                await out_file.write(content)
        return size

    @staticmethod
    def cleanup_file(file_path: Path):
        try:
            if file_path.exists():
                file_path.unlink()
        except Exception:
            pass
