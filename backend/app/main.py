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
from app.services.telegram_service import TelegramService
from app.core.database import get_session
from sqlalchemy import select

logger = logging.getLogger("video_menu.main")

async def telegram_updates_worker():
    """
    Background worker that polls Telegram Bot API getUpdates
    for active restaurants and handles callback queries (staff action buttons).
    """
    import sys
    import os
    if "pytest" in sys.modules or "pytest" in sys.argv[0] or bool(os.environ.get("PYTEST_CURRENT_TEST")):
        return

    logger.info("Starting Telegram Bot Callback Updates Poller...")
    offsets: dict[str, int] = {}

    while True:
        try:
            from app.models.restaurant import Restaurant
            tokens: list[str] = []
            async with (await get_session()) as session:
                res = await session.execute(
                    select(Restaurant.telegram_bot_token)
                    .where(Restaurant.telegram_enabled == True, Restaurant.telegram_bot_token.isnot(None))
                )
                tokens = [t.strip() for (t,) in res.all() if t and t.strip()]

            for token in set(tokens):
                offset = offsets.get(token, 0)
                url = f"https://api.telegram.org/bot{token}/getUpdates?offset={offset}&timeout=10&allowed_updates=[\"callback_query\"]"
                try:
                    import httpx
                    async with httpx.AsyncClient(timeout=15.0) as client:
                        resp = await client.get(url)
                        if resp.status_code == 200:
                            data = resp.json()
                            results = data.get("result", [])
                            for update in results:
                                update_id = update.get("update_id")
                                offsets[token] = update_id + 1
                                cq = update.get("callback_query")
                                if cq:
                                    async with (await get_session()) as db_session:
                                        await TelegramService.handle_callback_query(token, cq, db_session)
                except Exception as net_err:
                    logger.debug(f"Telegram poll request error: {net_err}")

            await asyncio.sleep(1)
        except asyncio.CancelledError:
            logger.info("Telegram updates worker stopped.")
            break
        except Exception as e:
            logger.error(f"Error in telegram updates worker: {e}")
            await asyncio.sleep(5)

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
    tg_task = asyncio.create_task(telegram_updates_worker())
    yield
    cleanup_task.cancel()
    tg_task.cancel()
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
