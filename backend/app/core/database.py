import logging
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.core.config import settings

logger = logging.getLogger("video_menu.database")

Base = declarative_base()

# Initialize engine with graceful fallback to sqlite if postgres is unavailable
_engine = None
AsyncSessionLocal = None

async def init_engine():
    global _engine, AsyncSessionLocal
    if _engine is not None:
        return _engine
    
    # Try PostgreSQL first (user asked for Docker DB)
    try:
        from sqlalchemy import text
        engine = create_async_engine(
            settings.DATABASE_URL,
            echo=False,
            future=True,
            pool_pre_ping=True
        )
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        _engine = engine
        logger.info(f"Connected successfully to PostgreSQL at {settings.DATABASE_URL}")
    except Exception as e:
        logger.warning(f"PostgreSQL connection failed ({e}). Falling back to SQLite: {settings.SQLITE_FALLBACK_URL}")
        _engine = create_async_engine(
            settings.SQLITE_FALLBACK_URL,
            echo=False,
            future=True
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
