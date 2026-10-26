import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_get_reservation_slots(client: AsyncClient):
    """Check that slots endpoint returns 30-minute intervals and active zones."""
    response = await client.get("/api/v1/reservations/slots?restaurant_slug=asr-royale&date=2026-11-20&guests=2")
    assert response.status_code == 200
    data = response.json()
    assert "slots" in data
    assert "zones" in data
    assert len(data["slots"]) > 0
    # For 2 guests, duration should be 90 minutes
    first_slot = data["slots"][0]
    assert first_slot["duration_minutes"] == 90
    assert first_slot["time"] == "11:00"
    assert first_slot["end_time"] == "12:30"
    assert first_slot["is_available"] is True


@pytest.mark.asyncio
async def test_get_slots_duration_scaling(client: AsyncClient):
    """Test that party sizes scale turnover duration (1-2: 90m, 3-5: 120m, 6+: 180m)."""
    # 4 guests -> 120 mins
    res_4 = await client.get("/api/v1/reservations/slots?restaurant_slug=asr-royale&date=2026-11-20&guests=4")
    assert res_4.status_code == 200
    assert res_4.json()["slots"][0]["duration_minutes"] == 120
    assert res_4.json()["slots"][0]["end_time"] == "13:00"

    # 8 guests -> 180 mins
    res_8 = await client.get("/api/v1/reservations/slots?restaurant_slug=asr-royale&date=2026-11-20&guests=8")
    assert res_8.status_code == 200
    assert res_8.json()["slots"][0]["duration_minutes"] == 180
    assert res_8.json()["slots"][0]["end_time"] == "14:00"


@pytest.mark.asyncio
async def test_create_and_manage_reservation_lifecycle(client: AsyncClient, admin_headers: dict):
    """Full booking lifecycle: create booking, check in admin list, update status to CONFIRMED and SEATED."""
    payload = {
        "restaurant_slug": "asr-royale",
        "reservation_date": "2026-11-20",
        "start_time": "19:00",
        "guests_count": 2,
        "guest_name": "Фарход Каримов",
        "guest_phone": "+992900112233",
        "guest_wishes": "Столик у камина, годовщина",
        "source": "KIOSK_STREET"
    }

    # 1. Create booking
    res = await client.post("/api/v1/reservations", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["booking_code"].startswith("BK-")
    assert data["start_time"] == "19:00"
    assert data["end_time"] == "20:30"  # 90 mins for 2 guests
    assert data["table_number"] is not None
    booking_id = data["id"]

    # 2. Check in admin list
    admin_res = await client.get(
        "/api/v1/reservations/admin/list?restaurant_slug=asr-royale&date=2026-11-20",
        headers=admin_headers
    )
    assert admin_res.status_code == 200
    bookings = admin_res.json()
    matched = [b for b in bookings if b["id"] == booking_id]
    assert len(matched) == 1
    assert matched[0]["guest_name"] == "Фарход Каримов"
    assert matched[0]["status"] == "PENDING"
    assert matched[0]["source"] == "KIOSK_STREET"

    # 3. Hostess confirms booking
    patch_res = await client.patch(
        f"/api/v1/reservations/{booking_id}/status",
        json={"status": "CONFIRMED"},
        headers=admin_headers
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["new_status"] == "CONFIRMED"

    # 4. Hostess seats the guests
    seat_res = await client.patch(
        f"/api/v1/reservations/{booking_id}/status",
        json={"status": "SEATED"},
        headers=admin_headers
    )
    assert seat_res.status_code == 200
    assert seat_res.json()["new_status"] == "SEATED"


@pytest.mark.asyncio
async def test_get_zones_and_tables(client: AsyncClient):
    """Verify endpoint returning restaurant zones with active tables."""
    res = await client.get("/api/v1/reservations/zones?restaurant_slug=asr-royale")
    assert res.status_code == 200
    zones = res.json()
    assert len(zones) >= 3
    zone_names = [z["name"] for z in zones]
    assert "Основной зал" in zone_names
    assert "Панорамная терраса" in zone_names
    assert "VIP-комната" in zone_names
