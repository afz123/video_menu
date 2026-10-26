import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.api.v1.router import api_router
from app.services.seed_data import seed_database

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
import asyncio
from app.services.storage_service import StorageService

logger = logging.getLogger("video_menu.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Video Menu Luxury Platform Backend...")
    try:
        await seed_database()
    except Exception as e:
        logger.error(f"Seeder execution failed: {e}", exc_info=True)

    # Initial cleanup and background periodic task (every 30 mins)
    StorageService.cleanup_expired_tmp_files(settings.TMP_DIR, max_age_seconds=3600)
    async def periodic_tmp_cleanup():
        while True:
            await asyncio.sleep(1800)
            StorageService.cleanup_expired_tmp_files(settings.TMP_DIR, max_age_seconds=3600)

    cleanup_task = asyncio.create_task(periodic_tmp_cleanup())
    yield
    cleanup_task.cancel()
    logger.info("Shutting down Video Menu Luxury Platform Backend...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware allowing web & tablet clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class VideoStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        response.headers["Accept-Ranges"] = "bytes"
        response.headers["Cache-Control"] = "public, max-age=604800, immutable"
        response.headers["Access-Control-Allow-Origin"] = "*"
        return response

# Mount video and asset storage with iOS Safari streaming support (HTTP 206 / Accept-Ranges)
app.mount("/static/videos", VideoStaticFiles(directory=str(settings.VIDEOS_DIR)), name="videos")

# Register API v1
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/api/health")
async def health_check():
    return {
        "status": "online",
        "service": "Video Menu Luxury Engine",
        "version": "1.0.0"
    }
