import pytest
import asyncio
from httpx import AsyncClient
from sqlalchemy import delete
from app.core.database import get_session
from app.models.reservation import TableReservation
from app.models.service_request import ServiceRequest
from app.core.security import generate_table_signature


@pytest.mark.asyncio
async def test_table_overbooking_race_condition_20_parallel(client: AsyncClient):
    """
    STRESS-01: 20 одновременных транзакций бронирования последнего стола на 19:30.
    Ожидание: Строго 1 транзакция получает подтверждение, остальные 19 корректно обрабатываются.
    """
    test_date = "2026-10-15"

    # Pre-clean date
    s1 = await get_session()
    async with s1 as db:
        await db.execute(delete(TableReservation).where(TableReservation.reservation_date == test_date))
        await db.commit()

    payload = {
        "restaurant_slug": "asr-royale",
        "reservation_date": test_date,
        "start_time": "19:30",
        "guests_count": 4,
        "table_id": 4,
        "source": "KIOSK_STREET"
    }

    async def execute_booking(idx: int):
        req_data = dict(payload)
        req_data["guest_name"] = f"Конкурентный Гость #{idx}"
        req_data["guest_phone"] = f"+99290000{idx:04d}"
        return await client.post("/api/v1/reservations", json=req_data)

    results = await asyncio.gather(*[execute_booking(i) for i in range(20)])

    table_4_assignments = 0
    for r in results:
        if r.status_code == 200:
            data = r.json()
            if data.get("table_number") == "4":
                table_4_assignments += 1

    # Cleanup after test
    s2 = await get_session()
    async with s2 as db:
        await db.execute(delete(TableReservation).where(TableReservation.reservation_date == test_date))
        await db.commit()

    assert table_4_assignments == 1, (
        f"CRITICAL: Стол №4 был забронирован параллельно {table_4_assignments} раз!"
    )


@pytest.mark.asyncio
async def test_stop_list_transactional_lock_conflict(client: AsyncClient, admin_headers: dict):
    """
    STRESS-02: Заказ блюда в миллисекунду постановки в стоп-лист.
    Ожидание: HTTP 409 Conflict.
    """
    menu_res = await client.get("/api/v1/restaurants/asr-royale/full-menu")
    assert menu_res.status_code == 200
    dish = menu_res.json()["categories"][0]["dishes"][0]
    dish_id = dish["id"]
    rest_id = menu_res.json()["restaurant"]["id"]

    # 1. Шеф переключает стоп-лист
    toggle_res = await client.patch(f"/api/v1/dishes/{dish_id}/toggle-stop-list", headers=admin_headers)
    assert toggle_res.status_code == 200

    # 2. Клиент пытается отправить заказ
    valid_sig = generate_table_signature(rest_id, "3")
    order_payload = {
        "table_number": "3",
        "table_token": valid_sig,
        "request_type": "order",
        "cart_items": [{"dish_id": dish_id, "name": "Тестовый стейк", "price": 350.0, "quantity": 1}]
    }
    order_res = await client.post("/api/v1/restaurants/asr-royale/service-requests", json=order_payload)
    assert order_res.status_code == 409
    assert "стоп" in order_res.json()["detail"].lower()

    # Восстановление
    await client.patch(f"/api/v1/dishes/{dish_id}/toggle-stop-list", headers=admin_headers)


@pytest.mark.asyncio
async def test_anti_spoofing_tampered_token(client: AsyncClient):
    """
    STRESS-03: Отправка вызова официанта с поддельной криптографической подписью.
    Ожидание: HTTP 403 Forbidden.
    """
    payload = {
        "table_number": "12",
        "table_token": "injected_tampered_token_9999",
        "request_type": "call_waiter",
        "guest_comment": "Fake call from outside"
    }
    res = await client.post("/api/v1/restaurants/asr-royale/service-requests", json=payload)
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_telegram_html_entity_sanitization(client: AsyncClient):
    """
    STRESS-04: Внедрение вредоносных тегов в комментарий гостя.
    Ожидание: Корректное экранирование без падения бота Telegram.
    """
    # Clean up pending requests on table 7
    s = await get_session()
    async with s as db:
        await db.execute(delete(ServiceRequest).where(ServiceRequest.table_number == "7"))
        await db.commit()

    valid_sig = generate_table_signature(1, "7")
    payload = {
        "table_number": "7",
        "table_token": valid_sig,
        "request_type": "call_waiter",
        "guest_comment": "<script>alert('XSS')</script> <b>Жирный</b> & несбалансированный <тег>"
    }
    res = await client.post("/api/v1/restaurants/asr-royale/service-requests", json=payload)
    assert res.status_code == 200
