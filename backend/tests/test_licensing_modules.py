import pytest
from httpx import AsyncClient
from app.core.security import generate_table_signature

@pytest.mark.asyncio
async def test_licensing_modules_isolation(client: AsyncClient, admin_headers):
    slug = "asr-royale"

    # 1. Fetch full menu and verify default modules
    menu_res = await client.get(f"/api/v1/restaurants/{slug}/full-menu")
    assert menu_res.status_code == 200
    menu_data = menu_res.json()
    restaurant = menu_data["restaurant"]
    assert "enabled_modules" in restaurant
    assert "menu" in restaurant["enabled_modules"]
    assert "ordering" in restaurant["enabled_modules"]

    # 2. Get valid table signature for table 1
    table_num = "1"
    sig_res = await client.get(f"/api/v1/restaurants/{slug}/table-signature?table={table_num}")
    assert sig_res.status_code == 200
    token = sig_res.json()["signature"]

    # 3. Restrict restaurant to only MOD_CORE_MENU ("menu")
    update_res = await client.put(
        f"/api/v1/restaurants/{slug}",
        json={"enabled_modules": ["menu"]},
        headers=admin_headers
    )
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["enabled_modules"] == ["menu"]

    # 4. Core menu endpoint still works perfectly (Zero-Degradation for Menu)
    menu_res2 = await client.get(f"/api/v1/restaurants/{slug}/full-menu")
    assert menu_res2.status_code == 200

    # 5. Ordering should be blocked with 403 Forbidden
    order_payload = {
        "table_number": table_num,
        "table_token": token,
        "request_type": "order",
        "cart_items": [{"id": 1, "dish_id": 1, "name": "Steak", "price": 100, "quantity": 1}]
    }
    order_res = await client.post(f"/api/v1/restaurants/{slug}/service-requests", json=order_payload)
    assert order_res.status_code == 403
    assert "не активирован" in order_res.json()["detail"]

    # 6. Service dispatch (call waiter) should be blocked with 403 Forbidden
    waiter_payload = {
        "table_number": table_num,
        "table_token": token,
        "request_type": "call_waiter",
        "guest_comment": "Позвать официанта"
    }
    waiter_res = await client.post(f"/api/v1/restaurants/{slug}/service-requests", json=waiter_payload)
    assert waiter_res.status_code == 403
    assert "не активирован" in waiter_res.json()["detail"]

    # 7. Reservations should be blocked with 403 Forbidden
    res_payload = {
        "restaurant_slug": slug,
        "guest_name": "Тестовый Гость",
        "guest_phone": "+992900998877",
        "reservation_date": "2026-11-01",
        "start_time": "19:00",
        "guest_count": 2
    }
    res_response = await client.post("/api/v1/reservations", json=res_payload)
    assert res_response.status_code == 403
    assert "не активирован" in res_response.json()["detail"]

    # Проверка блокировки слотов бронирования при отключенном модуле
    slots_res = await client.get(f"/api/v1/reservations/slots?restaurant_slug={slug}&date=2026-11-01&guests=2")
    assert slots_res.status_code == 403
    assert "не активирован" in slots_res.json()["detail"]

    # 8. Kiosk config should be blocked with 403 Forbidden
    kiosk_res = await client.get(f"/api/v1/kiosk/{slug}/config")
    assert kiosk_res.status_code == 403
    assert "не активирован" in kiosk_res.json()["detail"]

    # 8.1 Fail-safe verification: Core 'menu' is never blocked even if enabled_modules is empty
    from app.core.licensing import require_module, ModuleAccess
    class EmptyRestaurant:
        enabled_modules = []
    require_module(EmptyRestaurant(), ModuleAccess.MENU)

    # 8.2 Verify finance module protection: if guest_finance is disabled, tips & service charge are suppressed
    await client.put(
        f"/api/v1/restaurants/{slug}",
        json={"enabled_modules": ["menu", "ordering"]},
        headers=admin_headers
    )
    fin_order_payload = {
        "table_number": table_num,
        "table_token": token,
        "request_type": "order",
        "cart_items": [{"id": 1, "dish_id": 1, "name": "Steak", "price": 100, "quantity": 1}],
        "tip_amount": 25.0
    }
    fin_res = await client.post(f"/api/v1/restaurants/{slug}/service-requests", json=fin_order_payload)
    assert fin_res.status_code == 200
    fin_data = fin_res.json()
    assert fin_data["subtotal_amount"] == 100.0
    assert fin_data["service_charge_amount"] == 0.0
    assert fin_data["total_amount"] == 100.0

    # 9. Restore all modules for the demo restaurant
    restore_res = await client.put(
        f"/api/v1/restaurants/{slug}",
        json={"enabled_modules": ["menu", "ordering", "service_dispatch", "guest_finance", "reservations", "kiosk", "kds"]},
        headers=admin_headers
    )
    assert restore_res.status_code == 200
    assert len(restore_res.json()["enabled_modules"]) == 7

    # 10. Verify kiosk works again after restoring
    kiosk_restored = await client.get(f"/api/v1/kiosk/{slug}/config")
    assert kiosk_restored.status_code == 200

    # 11. Verify wishlist_only_mode & allow_self_ordering UI config gating on orders
    await client.put(
        f"/api/v1/restaurants/{slug}",
        json={"ui_config": {"cart": {"wishlist_only_mode": True, "allow_self_ordering": True}}},
        headers=admin_headers
    )
    wishlist_order_res = await client.post(f"/api/v1/restaurants/{slug}/service-requests", json=fin_order_payload)
    assert wishlist_order_res.status_code == 403
    assert "Прямой заказ отключен ресторатором" in wishlist_order_res.json()["detail"]

    # Restore default ui_config
    await client.put(
        f"/api/v1/restaurants/{slug}",
        json={"ui_config": {"cart": {"wishlist_only_mode": False, "allow_self_ordering": True}}},
        headers=admin_headers
    )


@pytest.mark.asyncio
async def test_manager_cannot_mutate_enabled_modules(client: AsyncClient, admin_headers):
    """
    IDOR Security: Manager of a restaurant branch cannot mutate commercial enabled_modules.
    Only SuperAdmin (vendor) can change enabled_modules.
    """
    from app.core.security import create_admin_token

    slug = "asr-royale"

    # 1. Superadmin sets initial modules to menu and ordering
    init_res = await client.put(
        f"/api/v1/restaurants/{slug}",
        json={"enabled_modules": ["menu", "ordering"]},
        headers=admin_headers
    )
    assert init_res.status_code == 200
    rest_data = init_res.json()
    assert set(rest_data["enabled_modules"]) == {"menu", "ordering"}
    restaurant_id = rest_data["id"]

    # 2. Branch manager tries to escalate privileges and enable KDS and kiosk
    manager_token = create_admin_token(
        role="manager",
        restaurant_id=restaurant_id,
        restaurant_slug=slug
    )
    manager_headers = {"Authorization": f"Bearer {manager_token}"}

    mgr_hack_res = await client.put(
        f"/api/v1/restaurants/{slug}",
        json={"name": "ASR Royale Luxe", "enabled_modules": ["menu", "ordering", "kds", "kiosk"]},
        headers=manager_headers
    )
    assert mgr_hack_res.status_code == 200
    mgr_data = mgr_hack_res.json()
    # Name updated, but enabled_modules ignored / rejected
    assert mgr_data["name"] == "ASR Royale Luxe"
    assert set(mgr_data["enabled_modules"]) == {"menu", "ordering"}

    # 3. Verify in database that enabled_modules was NOT modified
    verify_res = await client.get(f"/api/v1/restaurants/{slug}")
    assert verify_res.status_code == 200
    assert set(verify_res.json()["enabled_modules"]) == {"menu", "ordering"}

    # 4. Superadmin restores all modules
    restore_res = await client.put(
        f"/api/v1/restaurants/{slug}",
        json={"enabled_modules": ["menu", "ordering", "service_dispatch", "guest_finance", "reservations", "kiosk", "kds"]},
        headers=admin_headers
    )
    assert restore_res.status_code == 200
    assert len(restore_res.json()["enabled_modules"]) == 7

