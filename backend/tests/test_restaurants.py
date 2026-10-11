import pytest


@pytest.mark.asyncio
async def test_list_restaurants(client):
    """Test retrieving list of restaurants."""
    response = await client.get("/api/v1/restaurants")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    # Check default restaurant exists
    slugs = [r["slug"] for r in data]
    assert "asr-royale" in slugs


@pytest.mark.asyncio
async def test_get_restaurant_by_slug(client):
    """Test retrieving restaurant by slug."""
    response = await client.get("/api/v1/restaurants/asr-royale")
    assert response.status_code == 200
    data = response.json()
    assert data["slug"] == "asr-royale"
    assert "name" in data
    assert "supported_locales" in data


@pytest.mark.asyncio
async def test_get_restaurant_not_found(client):
    """Test retrieving non-existent restaurant returns 404."""
    response = await client.get("/api/v1/restaurants/non-existent-restaurant-999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_restaurant(client):
    """Test updating restaurant details."""
    response = await client.put(
        "/api/v1/restaurants/asr-royale",
        json={
            "description": "Updated luxury restaurant description for pytest"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["description"] == "Updated luxury restaurant description for pytest"


@pytest.mark.asyncio
async def test_get_restaurant_full_menu(client):
    """Test optimized full-menu endpoint."""
    response = await client.get("/api/v1/restaurants/asr-royale/full-menu")
    assert response.status_code == 200
    data = response.json()
    assert "restaurant" in data
    assert "categories" in data
    assert isinstance(data["categories"], list)
