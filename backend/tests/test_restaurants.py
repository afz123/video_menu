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
    import time
    from app.core.security import generate_table_signature
    tbl = f"T_{int(time.time() * 1000) % 100000}"
    sig = generate_table_signature(1, tbl)

    # 1. Guest calls waiter from unique table
    call_res = await client.post(
        "/api/v1/restaurants/asr-royale/service-requests",
        json={
            "table_number": tbl,
            "table_token": sig,
            "request_type": "call_waiter",
            "guest_comment": "Пожалуйста, принесите дополнительное меню десертов"
        }
    )
    assert call_res.status_code == 200
    req_data = call_res.json()
    req_id = req_data["id"]
    assert req_data["table_number"] == tbl
    assert req_data["status"] == "PENDING"

    # 2. Guest requests bill with card from same table (different request_type)
    bill_res = await client.post(
        "/api/v1/restaurants/asr-royale/service-requests",
        json={
            "table_number": tbl,
            "table_token": sig,
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
async def test_waiter_call_rate_limiting(client):
    """Test 45-second debounce protection against waiter call spam."""
    import time
    from app.core.security import generate_table_signature
    spam_table = f"SPAM_{int(time.time() * 1000) % 100000}"
    spam_sig = generate_table_signature(1, spam_table)

    # First waiter call succeeds
    res1 = await client.post(
        "/api/v1/restaurants/asr-royale/service-requests",
        json={"table_number": spam_table, "table_token": spam_sig, "request_type": "call_waiter"}
    )
    assert res1.status_code == 200

    # Immediate second call from same table and same request_type triggers 429
    res2 = await client.post(
        "/api/v1/restaurants/asr-royale/service-requests",
        json={"table_number": spam_table, "table_token": spam_sig, "request_type": "call_waiter"}
    )
    assert res2.status_code == 429
    assert "уже уведомлен" in res2.json()["detail"]


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

    from app.core.security import generate_table_signature
    sig7 = generate_table_signature(1, "7")

    # 3. Attempt to place an order with this stopped dish -> Should fail with 400
    order_res = await client.post(
        "/api/v1/restaurants/asr-royale/service-requests",
        json={
            "table_number": "7",
            "table_token": sig7,
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
    assert order_res.status_code == 409
    assert "стоп" in order_res.json()["detail"].lower()

    # 4. Restore availability -> Order should succeed
    restore_res = await client.put(f"/api/v1/dishes/{dish_id}", json={"is_available": True}, headers=admin_headers)
    assert restore_res.status_code == 200

    success_order = await client.post(
        "/api/v1/restaurants/asr-royale/service-requests",
        json={
            "table_number": "7",
            "table_token": sig7,
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
    from app.core.security import generate_table_signature
    sig12 = generate_table_signature(1, "12")

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
                "table_token": sig12,
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


@pytest.mark.asyncio
async def test_cross_tenant_idor_protection(client, admin_headers):
    """Test that a branch manager cannot update or delete dishes belonging to another restaurant (403 Forbidden)."""
    import uuid
    uid = uuid.uuid4().hex[:6]
    slug_steak = f"steak-{uid}"
    slug_sushi = f"sushi-{uid}"

    # 1. Create Steakhouse with manager password
    res_steak = await client.post(
        "/api/v1/restaurants",
        json={
            "name": f"Steakhouse {uid}",
            "slug": slug_steak,
            "currency": "USD",
            "admin_password": "steak_manager_pass"
        },
        headers=admin_headers
    )
    assert res_steak.status_code == 200
    steak_id = res_steak.json()["id"]

    # 2. Create Sushi Bar with manager password
    res_sushi = await client.post(
        "/api/v1/restaurants",
        json={
            "name": f"Sushi Bar {uid}",
            "slug": slug_sushi,
            "currency": "EUR",
            "admin_password": "sushi_manager_pass"
        },
        headers=admin_headers
    )
    assert res_sushi.status_code == 200
    sushi_id = res_sushi.json()["id"]

    # 3. Add Category and Dish to Sushi Bar
    cat_sushi = await client.post(
        "/api/v1/categories",
        json={
            "restaurant_id": sushi_id,
            "name_translations": {"ru": "Роллы", "en": "Rolls"},
            "icon": "fish",
            "display_order": 1
        },
        headers=admin_headers
    )
    assert cat_sushi.status_code == 200
    sushi_cat_id = cat_sushi.json()["id"]

    dish_sushi = await client.post(
        "/api/v1/dishes",
        json={
            "restaurant_id": sushi_id,
            "category_id": sushi_cat_id,
            "name_translations": {"ru": "Филадельфия", "en": "Philadelphia"},
            "price": 85.0
        },
        headers=admin_headers
    )
    assert dish_sushi.status_code == 200
    sushi_dish_id = dish_sushi.json()["id"]

    # 4. Manager of Steakhouse logs in
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"slug": slug_steak, "password": "steak_manager_pass"}
    )
    assert login_res.status_code == 200
    steak_token = login_res.json()["token"]
    assert login_res.json()["role"] == "manager"
    steak_headers = {"Authorization": f"Bearer {steak_token}"}

    # 5. Steakhouse manager attempts IDOR attack on Sushi Bar dish -> Expect 403 Forbidden
    idor_put = await client.put(
        f"/api/v1/dishes/{sushi_dish_id}",
        json={"price": 1.0},
        headers=steak_headers
    )
    assert idor_put.status_code == 403
    assert "Доступ запрещён" in idor_put.json()["detail"]

    idor_del = await client.delete(
        f"/api/v1/dishes/{sushi_dish_id}",
        headers=steak_headers
    )
    assert idor_del.status_code == 403

    idor_cat_del = await client.delete(
        f"/api/v1/categories/{sushi_cat_id}",
        headers=steak_headers
    )
    assert idor_cat_del.status_code == 403


@pytest.mark.asyncio
async def test_clone_menu_from_donor(client, admin_headers):
    """Test cloning menu from a donor restaurant into a newly opened branch."""
    import uuid
    uid = uuid.uuid4().hex[:6]
    donor_slug = f"donor-{uid}"
    target_slug = f"branch-{uid}"

    # 1. Create donor restaurant with category and dish
    res_donor = await client.post(
        "/api/v1/restaurants",
        json={"name": f"Donor Hub {uid}", "slug": donor_slug, "currency": "TJS"},
        headers=admin_headers
    )
    assert res_donor.status_code == 200
    donor_id = res_donor.json()["id"]

    donor_cat = await client.post(
        "/api/v1/categories",
        json={
            "restaurant_id": donor_id,
            "name_translations": {"ru": "Гриль меню", "en": "Grill Menu"},
            "icon": "flame"
        },
        headers=admin_headers
    )
    assert donor_cat.status_code == 200

    donor_dish = await client.post(
        "/api/v1/dishes",
        json={
            "restaurant_id": donor_id,
            "category_id": donor_cat.json()["id"],
            "name_translations": {"ru": "Фирменный Шашлык", "en": "Signature Kebab"},
            "price": 120.0,
            "currency": "TJS"
        },
        headers=admin_headers
    )
    assert donor_dish.status_code == 200

    # 2. Create new branch with currency USD
    res_target = await client.post(
        "/api/v1/restaurants",
        json={"name": f"Branch Dubai {uid}", "slug": target_slug, "currency": "USD"},
        headers=admin_headers
    )
    assert res_target.status_code == 200

    # 3. Clone menu from donor to target
    clone_res = await client.post(
        f"/api/v1/restaurants/{target_slug}/clone-menu-from/{donor_slug}",
        headers=admin_headers
    )
    assert clone_res.status_code == 200
    clone_data = clone_res.json()
    assert clone_data["status"] == "success"
    assert clone_data["categories_cloned"] == 1
    assert clone_data["dishes_cloned"] == 1

    # 4. Verify target restaurant menu has the cloned dish with target currency USD
    target_menu = await client.get(f"/api/v1/restaurants/{target_slug}/full-menu")
    assert target_menu.status_code == 200
    cats = target_menu.json()["categories"]
    assert len(cats) == 1
    assert cats[0]["name"]["ru"] == "Гриль меню"
    assert len(cats[0]["dishes"]) == 1
    dish = cats[0]["dishes"][0]
    assert dish["name"]["ru"] == "Фирменный Шашлык"
    assert dish["currency"] == "USD"

@pytest.mark.asyncio
async def test_ui_config_feature_flags_engine(client, admin_headers):
    """Test White-Label Feature Flags engine: retrieval, customization and persistence."""
    import uuid
    uid = uuid.uuid4().hex[:6]
    test_slug = f"ui-flags-{uid}"

    # 1. Create a restaurant
    res = await client.post(
        "/api/v1/restaurants",
        json={"name": f"UI Test Hub {uid}", "slug": test_slug, "currency": "TJS"},
        headers=admin_headers
    )
    assert res.status_code == 200

    # 2. Check full-menu endpoint defaults
    menu_res = await client.get(f"/api/v1/restaurants/{test_slug}/full-menu")
    assert menu_res.status_code == 200
    menu_data = menu_res.json()
    ui_cfg = menu_data["restaurant"]["ui_config"]
    assert "header" in ui_cfg
    assert "dish_card" in ui_cfg
    assert "service_bar" in ui_cfg
    assert "cart" in ui_cfg
    assert "kiosk" in ui_cfg
    assert ui_cfg["dish_card"]["show_sound_toggle"] is True
    assert ui_cfg["dish_card"]["show_add_to_cart_btn"] is True

    # 3. Update UI config via dedicated endpoint: turn off add_to_cart (Showcase only mode)
    custom_ui = {
        "dish_card": {
            "show_sound_toggle": False,
            "show_add_to_cart_btn": False,
            "show_price": True
        },
        "service_bar": {
            "show_service_bar": False
        }
    }
    update_res = await client.put(
        f"/api/v1/restaurants/{test_slug}/ui-config",
        json=custom_ui,
        headers=admin_headers
    )
    assert update_res.status_code == 200
    updated_ui = update_res.json()["ui_config"]
    assert updated_ui["dish_card"]["show_sound_toggle"] is False
    assert updated_ui["dish_card"]["show_add_to_cart_btn"] is False

    # 4. Verify full-menu returns updated custom config
    menu_res_2 = await client.get(f"/api/v1/restaurants/{test_slug}/full-menu")
    assert menu_res_2.status_code == 200
    fresh_ui = menu_res_2.json()["restaurant"]["ui_config"]
    assert fresh_ui["dish_card"]["show_sound_toggle"] is False
    assert fresh_ui["dish_card"]["show_add_to_cart_btn"] is False
    assert fresh_ui["service_bar"]["show_service_bar"] is False



