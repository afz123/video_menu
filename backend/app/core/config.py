import os
from pydantic_settings import BaseSettings
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "Video Menu Luxury Platform"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    API_V1_STR: str = "/api/v1"
    
    # Database config (Postgres in Docker by default on port 5435 or standard 5432)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql+asyncpg://videomenu:videomenu@127.0.0.1:5435/videomenu"
    )
    SQLITE_FALLBACK_URL: str = f"sqlite+aiosqlite:///{BASE_DIR}/storage/videomenu.db"
    
    # Storage paths
    STORAGE_DIR: Path = BASE_DIR / "storage"
    VIDEOS_DIR: Path = BASE_DIR / "storage" / "videos"
    TMP_DIR: Path = BASE_DIR / "storage" / "tmp"
    
    # Transcoder settings
    MAX_VIDEO_SIZE_MB: int = 150
    DEFAULT_INACTIVITY_SECONDS: int = 45

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()

# Ensure directories exist
settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
settings.VIDEOS_DIR.mkdir(parents=True, exist_ok=True)
settings.TMP_DIR.mkdir(parents=True, exist_ok=True)
