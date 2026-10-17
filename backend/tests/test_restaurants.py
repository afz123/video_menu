import pytest


@pytest.mark.asyncio
async def test_list_restaurants(client):
    """Test retrieving list of restaurants."""
    response = await client.get("/api/v1/restaurants")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
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
async def test_update_restaurant_requires_auth(client):
    """Test mutating restaurant without auth returns 401."""
    res = await client.put(
        "/api/v1/restaurants/asr-royale",
        json={"description": "Hack attempt without token"}
    )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_update_restaurant(client, admin_headers):
    """Test updating restaurant details with admin token."""
    response = await client.put(
        "/api/v1/restaurants/asr-royale",
        json={
            "description": "Updated luxury restaurant description for pytest"
        },
        headers=admin_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["description"] == "Updated luxury restaurant description for pytest"


@pytest.mark.asyncio
async def test_get_restaurant_full_menu(client):
    """Test optimized full-menu endpoint returns badges, modifiers, and categories."""
    response = await client.get("/api/v1/restaurants/asr-royale/full-menu")
    assert response.status_code == 200
    data = response.json()
    assert "restaurant" in data
    assert "categories" in data
    assert isinstance(data["categories"], list)
    if len(data["categories"]) > 0 and len(data["categories"][0]["dishes"]) > 0:
        d = data["categories"][0]["dishes"][0]
        assert "badges" in d
        assert "modifiers" in d
        assert "pairings" in d


@pytest.mark.asyncio
async def test_smart_table_service_requests(client, admin_headers):
    """Test guest waiter call, bill request, and admin resolution."""
    # 1. Guest calls waiter from Table 14
    call_res = await client.post(
        "/api/v1/restaurants/asr-royale/service-requests",
        json={
            "table_number": "14",
            "request_type": "call_waiter",
            "guest_comment": "Пожалуйста, принесите дополнительное меню десертов"
        }
    )
    assert call_res.status_code == 200
    req_data = call_res.json()
    req_id = req_data["id"]
    assert req_data["table_number"] == "14"
    assert req_data["status"] == "PENDING"

    # 2. Guest requests bill with card from Table 14
    bill_res = await client.post(
        "/api/v1/restaurants/asr-royale/service-requests",
        json={
            "table_number": "14",
            "request_type": "request_bill_card",
            "guest_comment": "Оплата картой"
        }
    )
    assert bill_res.status_code == 200

    # 3. Admin lists active service requests (requires auth)
    unauth_list = await client.get("/api/v1/restaurants/asr-royale/service-requests")
    assert unauth_list.status_code == 401

    auth_list = await client.get("/api/v1/restaurants/asr-royale/service-requests", headers=admin_headers)
    assert auth_list.status_code == 200
    items = auth_list.json()
    assert len(items) >= 2

    # 4. Admin resolves request
    update_res = await client.patch(
        f"/api/v1/restaurants/asr-royale/service-requests/{req_id}/status",
        json={"status": "COMPLETED"},
        headers=admin_headers
    )
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "COMPLETED"


@pytest.mark.asyncio
async def test_service_charge_and_telegram_settings(client, admin_headers):
    """Test updating service charge percent and telegram credentials."""
    # 1. Update restaurant with 12% service charge and telegram settings
    update_res = await client.put(
        "/api/v1/restaurants/asr-royale",
        json={
            "service_charge_percent": 12.0,
            "telegram_enabled": True,
            "telegram_bot_token": "fake_test_token_123",
            "telegram_chat_id": "-100987654321"
        },
        headers=admin_headers
    )
    assert update_res.status_code == 200
    data = update_res.json()
    assert data["service_charge_percent"] == 12.0
    assert data["telegram_enabled"] is True

    # 2. Check full menu includes service_charge_percent
    menu_res = await client.get("/api/v1/restaurants/asr-royale/full-menu")
    assert menu_res.status_code == 200
    menu_data = menu_res.json()
    assert menu_data["restaurant"]["service_charge_percent"] == 12.0
    assert menu_data["restaurant"]["telegram_enabled"] is True

    # 3. Test telegram test endpoint requires admin auth
    unauth_test = await client.post("/api/v1/restaurants/asr-royale/test-telegram")
    assert unauth_test.status_code == 401

