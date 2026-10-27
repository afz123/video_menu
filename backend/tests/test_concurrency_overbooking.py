import pytest
import asyncio
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_table_overbooking_concurrency_race(client: AsyncClient):
    """
    Эмуляция одновременного нажатия кнопки 'Забронировать' 20 пользователями
    на один и тот же последний свободный стол на 19:30.
    Ожидаемый результат: ровно 1 успешная бронь (200 OK) на стол №4, остальные — отказ или выбор другого стола.
    Ни при каких условиях 2 бронирования не должны получить один и тот же table_id.
    """
    booking_payload = {
        "restaurant_slug": "asr-royale",
        "reservation_date": "2026-12-31",
        "start_time": "19:30",
        "guests_count": 4,
        "table_id": 4,  # Жестко запрашиваем один и тот же 4-местный стол №4
        "guest_name": "Конкурентный Гость",
        "guest_phone": "+992900000001",
        "source": "KIOSK_STREET"
    }

    from app.core.database import get_session
    from app.models.reservation import TableReservation
    from sqlalchemy import delete

    # Очистка тестовых броней перед запуском гонки
    s1 = await get_session()
    async with s1 as db:
        await db.execute(delete(TableReservation).where(TableReservation.reservation_date == "2026-12-31"))
        await db.commit()

    async def send_booking(idx: int):
        payload = dict(booking_payload)
        payload["guest_name"] = f"Гость #{idx}"
        payload["guest_phone"] = f"+99290000{idx:04d}"
        return await client.post("/api/v1/reservations", json=payload)

    # Запускаем 20 одновременных корутин в одну миллисекунду
    tasks = [send_booking(i) for i in range(20)]
    responses = await asyncio.gather(*tasks)

    successful_assignments_to_table_4 = 0
    assigned_tables = []

    for r in responses:
        if r.status_code == 200:
            data = r.json()
            table_num = data.get("table_number")
            assigned_tables.append(table_num)
            if table_num == "4":
                successful_assignments_to_table_4 += 1

    # ВАЛИДАЦИЯ БЕСКОЛЛИЗИОННОСТИ: Стол №4 может быть отдан строго 1 раз!
    assert successful_assignments_to_table_4 == 1, (
        f"CRITICAL OVERBOOKING BUG: Стол №4 был назначен {successful_assignments_to_table_4} раз одновременно!"
    )

    # Очистка тестовых данных после теста
    s2 = await get_session()
    async with s2 as db:
        await db.execute(delete(TableReservation).where(TableReservation.reservation_date == "2026-12-31"))
        await db.commit()
