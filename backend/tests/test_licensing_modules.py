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
