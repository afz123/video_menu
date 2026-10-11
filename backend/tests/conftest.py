import sys
import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

# Ensure backend root is in PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.database import init_engine, Base
from app.services.seed_data import seed_database


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_db():
    """Ensure database schema is created and initialized before tests run."""
    engine = await init_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await seed_database()
    yield


@pytest_asyncio.fixture
async def client():
    """Provides async HTTP client connected to FastAPI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
