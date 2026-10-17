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


@pytest.mark.asyncio
async def test_order_stop_list_validation(client, admin_headers):
    """Test that submitting an order containing an unavailable dish returns 400 Bad Request."""
    # 1. Get an existing dish ID
    menu_res = await client.get("/api/v1/restaurants/asr-royale/full-menu?include_unavailable=true")
    assert menu_res.status_code == 200
    dish_id = menu_res.json()["categories"][0]["dishes"][0]["id"]

    # 2. Put the dish into stop-list (is_available = False)
    put_res = await client.put(f"/api/v1/dishes/{dish_id}", json={"is_available": False}, headers=admin_headers)
    assert put_res.status_code == 200

    # 3. Attempt to place an order with this stopped dish -> Should fail with 400
    order_res = await client.post(
        "/api/v1/restaurants/asr-royale/service-requests",
        json={
            "table_number": "7",
            "request_type": "order",
            "guest_comment": "Тестовый заказ",
            "cart_items": [
                {
                    "dish_id": dish_id,
                    "name": "Стейк из стоп-листа",
                    "quantity": 1,
                    "price": 350.0
                }
            ]
        }
    )
    assert order_res.status_code == 400
    assert "стоп-листе" in order_res.json()["detail"]

    # 4. Restore availability -> Order should succeed
    restore_res = await client.put(f"/api/v1/dishes/{dish_id}", json={"is_available": True}, headers=admin_headers)
    assert restore_res.status_code == 200

    success_order = await client.post(
        "/api/v1/restaurants/asr-royale/service-requests",
        json={
            "table_number": "7",
            "request_type": "order",
            "guest_comment": "Повторный заказ",
            "cart_items": [
                {
                    "dish_id": dish_id,
                    "name": "Стейк доступен",
                    "quantity": 1,
                    "price": 350.0
                }
            ]
        }
    )
    assert success_order.status_code == 200
    assert success_order.json()["status"] == "PENDING"


@pytest.mark.asyncio
async def test_dynamic_service_charge_calculation_in_telegram(client, admin_headers):
    """Test dynamic calculation of service charge (e.g. 15%) on an order of 200 -> total 230."""
    from unittest.mock import patch, AsyncMock
    from app.services.telegram_service import TelegramService

    # 1. Update restaurant to 15% service charge
    update_res = await client.put(
        "/api/v1/restaurants/asr-royale",
        json={
            "service_charge_percent": 15.0,
            "currency": "TJS",
            "telegram_enabled": True,
            "telegram_bot_token": "valid_mock_token_123",
            "telegram_chat_id": "-100123456789"
        },
        headers=admin_headers
    )
    assert update_res.status_code == 200
    assert update_res.json()["service_charge_percent"] == 15.0

    # 2. Intercept TelegramService.send_message
    with patch.object(TelegramService, "send_message", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = True

        order_res = await client.post(
            "/api/v1/restaurants/asr-royale/service-requests",
            json={
                "table_number": "12",
                "request_type": "order",
                "guest_comment": "Стейк рибай с соусом",
                "cart_items": [
                    {
                        "name": "Стейк Рибай Прайм",
                        "quantity": 1,
                        "price": 200.0,
                        "chosen_options": [
                            {"group": "Прожарка", "name": "Medium Rare", "price": 0}
                        ]
                    }
                ]
            }
        )
        assert order_res.status_code == 200
        req_id = order_res.json()["id"]
        assert req_id is not None

        # Check that Telegram notification was dispatched with 15% calculation (200 + 30 = 230)
        assert mock_send.called
        sent_text = mock_send.call_args[0][2]
        assert "15%" in sent_text
        assert "200.0 TJS" in sent_text
        assert "30.0 TJS" in sent_text
        assert "230.0 TJS" in sent_text


@pytest.mark.asyncio
async def test_multitenancy_isolation_by_slug(client, admin_headers):
    """Test multitenancy isolation: categories and dishes of different restaurants do not overlap."""
    import uuid
    uid = uuid.uuid4().hex[:6]
    slug_a = f"cafe-shashlik-{uid}"
    slug_b = f"lounge-bar-{uid}"

    # 1. Create Restaurant A
    res_a = await client.post(
        "/api/v1/restaurants",
        json={
            "name": f"Кафе Шашлычная {uid}",
            "slug": slug_a,
            "currency": "TJS",
            "service_charge_percent": 10.0
        },
        headers=admin_headers
    )
    assert res_a.status_code == 200
    rest_a_id = res_a.json()["id"]

    # 2. Create Restaurant B
    res_b = await client.post(
        "/api/v1/restaurants",
        json={
            "name": f"Skyline Lounge {uid}",
            "slug": slug_b,
            "currency": "USD",
            "service_charge_percent": 15.0
        },
        headers=admin_headers
    )
    assert res_b.status_code == 200
    rest_b_id = res_b.json()["id"]

    # 3. Add Category to Restaurant A
    cat_a = await client.post(
        "/api/v1/categories",
        json={
            "restaurant_id": rest_a_id,
            "name_translations": {"ru": "Мангал и Шашлыки", "en": "Grill & BBQ"},
            "icon": "flame",
            "display_order": 1
        },
        headers=admin_headers
    )
    assert cat_a.status_code == 200
    cat_a_id = cat_a.json()["id"]

    # 4. Add Category to Restaurant B
    cat_b = await client.post(
        "/api/v1/categories",
        json={
            "restaurant_id": rest_b_id,
            "name_translations": {"ru": "Коктейли и Смузи", "en": "Cocktails & Smoothies"},
            "icon": "wine",
            "display_order": 1
        },
        headers=admin_headers
    )
    assert cat_b.status_code == 200
    cat_b_id = cat_b.json()["id"]

    # 5. Query Full Menu for Restaurant A -> only A's categories
    menu_a = await client.get(f"/api/v1/restaurants/{slug_a}/full-menu")
    assert menu_a.status_code == 200
    cats_a_names = [c["name"].get("ru") for c in menu_a.json()["categories"]]
    assert "Мангал и Шашлыки" in cats_a_names
    assert "Коктейли и Смузи" not in cats_a_names

    # 6. Query Full Menu for Restaurant B -> only B's categories
    menu_b = await client.get(f"/api/v1/restaurants/{slug_b}/full-menu")
    assert menu_b.status_code == 200
    cats_b_names = [c["name"].get("ru") for c in menu_b.json()["categories"]]
    assert "Коктейли и Смузи" in cats_b_names
    assert "Мангал и Шашлыки" not in cats_b_names

    # 7. Check category list filtering by restaurant_id
    cat_list_a = await client.get(f"/api/v1/categories?restaurant_id={rest_a_id}")
    assert cat_list_a.status_code == 200
    assert all(c["restaurant_id"] == rest_a_id for c in cat_list_a.json())


@pytest.mark.asyncio
async def test_telegram_test_endpoint_bad_gateway(client, admin_headers):
    """Test that invalid telegram credentials return 502 Bad Gateway instead of 500 unhandled crash."""
    from unittest.mock import patch, AsyncMock
    from app.services.telegram_service import TelegramService

    # 1. Update restaurant with broken telegram bot credentials
    await client.put(
        "/api/v1/restaurants/asr-royale",
        json={
            "telegram_bot_token": "broken_invalid_token",
            "telegram_chat_id": "-9999999999"
        },
        headers=admin_headers
    )

    # 2. Mock send_message returning False (simulating Telegram API rejection)
    with patch.object(TelegramService, "send_message", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = False

        res = await client.post("/api/v1/restaurants/asr-royale/test-telegram", headers=admin_headers)
        assert res.status_code == 502
        assert "Не удалось доставить сообщение в Telegram" in res.json()["detail"]


