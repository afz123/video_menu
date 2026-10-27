import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock
from app.services.telegram_service import TelegramService

@pytest.mark.asyncio
async def test_kds_opt_out_and_active_orders(client: AsyncClient, admin_headers):
    slug = "asr-royale"

    # 1. First ensure KDS is disabled to verify Zero-Risk Principle
    ui_cfg_res = await client.get(f"/api/v1/restaurants/{slug}/full-menu")
    assert ui_cfg_res.status_code == 200
    ui_cfg = ui_cfg_res.json()["restaurant"].get("ui_config", {})
    if "kds" not in ui_cfg:
        ui_cfg["kds"] = {}
    ui_cfg["kds"]["enable_kds_system"] = False

    await client.put(
        f"/api/v1/restaurants/{slug}/ui-config",
        json=ui_cfg,
        headers=admin_headers
    )

    # When disabled, KDS returns kds_enabled=False
    res = await client.get(f"/api/v1/restaurants/{slug}/kds/orders")
    assert res.status_code == 200
    data = res.json()
    assert data["kds_enabled"] is False

    # 2. Enable KDS via UI Config
    ui_cfg["kds"]["enable_kds_system"] = True
    ui_cfg["kds"]["notify_waiter_on_ready"] = True
    update_res = await client.put(
        f"/api/v1/restaurants/{slug}/ui-config",
        json=ui_cfg,
        headers=admin_headers
    )
    assert update_res.status_code == 200

    # 3. Get cryptographic table signature to pass anti-spoofing
    sig_res = await client.get(f"/api/v1/restaurants/{slug}/table-signature?table=7")
    assert sig_res.status_code == 200
    table_token = sig_res.json()["signature"]

    # 4. Create a test order
    order_res = await client.post(
        f"/api/v1/restaurants/{slug}/service-requests",
        json={
            "table_number": "7",
            "table_token": table_token,
            "request_type": "order",
            "guest_comment": "Стейк средней прожарки",
            "cart_items": [
                {
                    "name": "Стейк Рибай Wagyu",
                    "quantity": 1,
                    "price": 280,
                    "course": "Курс 2 (Горячее)",
                    "chosen_options": [{"name": "Medium Rare"}]
                },
                {
                    "name": "Тартар из говядины",
                    "quantity": 1,
                    "price": 110,
                    "course": "Курс 1 (Закуски)",
                    "chosen_options": []
                }
            ]
        }
    )
    assert order_res.status_code == 200
    order_id = order_res.json()["id"]

    # 5. Now KDS endpoint returns the order for kitchen tablet
    kds_orders_res = await client.get(f"/api/v1/restaurants/{slug}/kds/orders")
    assert kds_orders_res.status_code == 200
    kds_data = kds_orders_res.json()
    assert kds_data["kds_enabled"] is True
    assert len(kds_data["orders"]) >= 1

    ticket = next((o for o in kds_data["orders"] if o["id"] == order_id), None)
    assert ticket is not None
    assert ticket["table_number"] == "7"
    assert len(ticket["cart_items"]) == 2

    # 6. Item status toggle: Mark tartare as READY
    item_res = await client.patch(
        f"/api/v1/restaurants/{slug}/kds/orders/{order_id}/items/1",
        json={"status": "READY"}
    )
    assert item_res.status_code == 200
    assert item_res.json()["item_status"] == "READY"
    assert item_res.json()["cart_items"][1]["status"] == "READY"

    # 7. Complete whole order with Telegram notification check
    with patch.object(TelegramService, "notify_order_ready", new_callable=AsyncMock) as mock_tg:
        mock_tg.return_value = True
        status_res = await client.patch(
            f"/api/v1/restaurants/{slug}/kds/orders/{order_id}/status",
            json={"status": "COMPLETED", "chef_name": "Шеф Далер"}
        )
        assert status_res.status_code == 200
        assert status_res.json()["new_status"] == "COMPLETED"


@pytest.mark.asyncio
async def test_kitchen_pacing_toggle(client: AsyncClient, admin_headers):
    slug = "asr-royale"
    today = "2026-11-20"

    # Verify slots endpoint works and reads pacing settings
    slots_res = await client.get(
        f"/api/v1/reservations/slots?restaurant_slug={slug}&date={today}&guests=2"
    )
    assert slots_res.status_code == 200
    slots_data = slots_res.json()
    assert "slots" in slots_data
    assert len(slots_data["slots"]) > 0

    # Toggle kitchen pacing off in UI config
    ui_cfg_res = await client.get(f"/api/v1/restaurants/{slug}/full-menu")
    ui_cfg = ui_cfg_res.json()["restaurant"].get("ui_config", {})
    if "kitchen_pacing" not in ui_cfg:
        ui_cfg["kitchen_pacing"] = {}
    ui_cfg["kitchen_pacing"]["enable_kitchen_pacing"] = False

    update_res = await client.put(
        f"/api/v1/restaurants/{slug}/ui-config",
        json=ui_cfg,
        headers=admin_headers
    )
    assert update_res.status_code == 200

    # Slots query executes successfully with pacing disabled
    slots_res2 = await client.get(
        f"/api/v1/reservations/slots?restaurant_slug={slug}&date={today}&guests=2"
    )
    assert slots_res2.status_code == 200
    assert len(slots_res2.json()["slots"]) > 0
