import sys
import os
import asyncio
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

# Ensure backend root is in PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.database import init_engine, Base
from app.services.seed_data import seed_database
from app.core.security import MASTER_DEMO_TOKEN

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_db(event_loop):
    """Ensure database schema is created and initialized before tests run."""
    from sqlalchemy import text
    engine = await init_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        try:
            await conn.execute(text("DELETE FROM table_reservations WHERE guest_phone = '+992900112233' OR guest_name LIKE 'Фарход%';"))
        except Exception:
            pass
    await seed_database()
    yield

@pytest_asyncio.fixture
async def client():
    """Provides async HTTP client connected to FastAPI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

@pytest.fixture
def admin_headers():
    return {"Authorization": f"Bearer {MASTER_DEMO_TOKEN}"}
