import pytest


@pytest.mark.asyncio
async def test_health_check(client):
    """Test /api/health endpoint returns 200 and online status."""
    response = await client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "Video Menu Luxury Engine" in data["service"]
    assert "version" in data
