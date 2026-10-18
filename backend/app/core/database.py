import logging
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.core.config import settings

logger = logging.getLogger("video_menu.database")

Base = declarative_base()

import asyncio
from sqlalchemy.pool import NullPool

# Initialize engine with graceful fallback to sqlite if postgres is unavailable
_engine = None
AsyncSessionLocal = None
_init_lock = asyncio.Lock()

async def init_engine():
    global _engine, AsyncSessionLocal
    if _engine is not None:
        return _engine
    
    async with _init_lock:
        if _engine is not None:
            return _engine

        from sqlalchemy import text
        import sys
        import os
        is_testing = "pytest" in sys.modules or "pytest" in sys.argv[0] or bool(os.environ.get("PYTEST_CURRENT_TEST"))

        connected = False
        try:
            if is_testing:
                engine = create_async_engine(
                    settings.DATABASE_URL,
                    echo=False,
                    future=True,
                    poolclass=NullPool
                )
            else:
                engine = create_async_engine(
                    settings.DATABASE_URL,
                    echo=False,
                    future=True,
                    pool_size=20,
                    max_overflow=10,
                    pool_pre_ping=True,
                    pool_recycle=3600
                )
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            _engine = engine
            logger.info(f"Connected successfully to PostgreSQL at {settings.DATABASE_URL} (is_testing={is_testing})")
            connected = True
        except Exception as e:
            logger.debug(f"PostgreSQL connection failed for {settings.DATABASE_URL}: {e}")

        if not connected:
            logger.warning(f"All PostgreSQL attempts failed. Falling back to SQLite: {settings.SQLITE_FALLBACK_URL}")
            from sqlalchemy import event
            _engine = create_async_engine(
                settings.SQLITE_FALLBACK_URL,
                echo=False,
                future=True,
                poolclass=NullPool,
                connect_args={"timeout": 15}
            )

            @event.listens_for(_engine.sync_engine, "connect")
            def set_sqlite_pragma(dbapi_connection, connection_record):
                cursor = dbapi_connection.cursor()
                cursor.execute("PRAGMA journal_mode=WAL")
                cursor.execute("PRAGMA synchronous=NORMAL")
                cursor.execute("PRAGMA busy_timeout=10000")
                cursor.close()

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
