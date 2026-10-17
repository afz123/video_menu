import logging
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.core.config import settings

logger = logging.getLogger("video_menu.database")

Base = declarative_base()

from sqlalchemy.pool import NullPool

# Initialize engine with graceful fallback to sqlite if postgres is unavailable
_engine = None
AsyncSessionLocal = None

async def init_engine():
    global _engine, AsyncSessionLocal
    if _engine is not None:
        return _engine
    
    # Try PostgreSQL first (user asked for Docker DB)
    urls_to_try = [settings.DATABASE_URL]
    if "5431" in settings.DATABASE_URL:
        urls_to_try.append(settings.DATABASE_URL.replace("5431", "5435"))
    elif "5435" in settings.DATABASE_URL:
        urls_to_try.append(settings.DATABASE_URL.replace("5435", "5431"))
    
    from sqlalchemy import text
    connected = False
    for db_url in urls_to_try:
        try:
            engine = create_async_engine(
                db_url,
                echo=False,
                future=True,
                poolclass=NullPool
            )
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            _engine = engine
            logger.info(f"Connected successfully to PostgreSQL at {db_url}")
            connected = True
            break
        except Exception as e:
            logger.debug(f"Attempt failed for {db_url}: {e}")

    if not connected:
        logger.warning(f"All PostgreSQL attempts failed. Falling back to SQLite: {settings.SQLITE_FALLBACK_URL}")
        _engine = create_async_engine(
            settings.SQLITE_FALLBACK_URL,
            echo=False,
            future=True,
            poolclass=NullPool
        )

    AsyncSessionLocal = async_sessionmaker(
        bind=_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False
    )
    return _engine

async def get_session():
    global AsyncSessionLocal
    if AsyncSessionLocal is None:
        await init_engine()
    return AsyncSessionLocal()

async def get_db():
    session = await get_session()
    async with session:
        try:
            yield session
        finally:
            await session.close()
