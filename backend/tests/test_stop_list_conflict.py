import pytest
import asyncio
from httpx import AsyncClient
from app.core.security import generate_table_signature

@pytest.mark.asyncio
async def test_stop_list_instant_rejection(client: AsyncClient, admin_headers: dict):
    """
    Проверка гонки: заказ блюда в ту же секунду, когда шеф-повар нажал стоп-лист.
    Клиент должен получить 409 Conflict с внятным уведомлением, а не фантомный заказ на кухню.
    """
    menu_res = await client.get("/api/v1/restaurants/asr-royale/full-menu")
    assert menu_res.status_code == 200
    menu_data = menu_res.json()
    dish = menu_data["categories"][0]["dishes"][0]
    dish_id = dish["id"]
    rest_id = menu_data["restaurant"]["id"]

    # 1. Отправляем блюдо в стоп-лист
    patch_res = await client.patch(f"/api/v1/dishes/{dish_id}/toggle-stop-list", headers=admin_headers)
    assert patch_res.status_code == 200

    # 2. Клиент пытается отправить заказ с этим блюдом
    valid_sig = generate_table_signature(rest_id, "5")
    order_payload = {
        "table_number": "5",
        "table_token": valid_sig,
        "request_type": "order",
        "cart_items": [{"dish_id": dish_id, "name": "Тест Стейк", "quantity": 1, "price": 300.0}]
    }
    res = await client.post("/api/v1/restaurants/asr-royale/service-requests", json=order_payload)
    
    assert res.status_code == 409
    assert "стоп" in res.json()["detail"].lower()

    # 3. Возвращаем в продажу
    restore_res = await client.patch(f"/api/v1/dishes/{dish_id}/toggle-stop-list", headers=admin_headers)
    assert restore_res.status_code == 200
