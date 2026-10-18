import pytest
import asyncio
from app.core.config import settings
from app.core.security import create_admin_token, is_valid_token, check_restaurant_access, AdminSession
from fastapi import HTTPException


@pytest.mark.asyncio
async def test_idor_cross_branch_category_injection(client, admin_headers):
    """
    Test 1.2 / P0: Verify that a manager/admin cannot inject a dish into Restaurant A
    using a category_id belonging to Restaurant B (IDOR prevention).
    """
    import uuid
    uid = uuid.uuid4().hex[:6]

    # 1. Create Restaurant A
    res_a = await client.post(
        "/api/v1/restaurants",
        json={"name": f"Rest A {uid}", "slug": f"rest-a-{uid}"},
        headers=admin_headers
    )
    assert res_a.status_code == 200
    rest_a_id = res_a.json()["id"]

    # 2. Create Restaurant B and a Category in Restaurant B
    res_b = await client.post(
        "/api/v1/restaurants",
        json={"name": f"Rest B {uid}", "slug": f"rest-b-{uid}"},
        headers=admin_headers
    )
    assert res_b.status_code == 200
    rest_b_id = res_b.json()["id"]

    cat_b = await client.post(
        "/api/v1/categories",
        json={
            "restaurant_id": rest_b_id,
            "name_translations": {"ru": "Категория Б"},
            "icon": "star"
        },
        headers=admin_headers
    )
    assert cat_b.status_code == 200
    cat_b_id = cat_b.json()["id"]

    # 3. Attempt to create a dish in Restaurant A with Category B id -> MUST BE 400 Bad Request
    malicious_dish_payload = {
        "restaurant_id": rest_a_id,
        "category_id": cat_b_id,
        "name_translations": {"ru": "Троянское блюдо"},
        "price": 100.0,
        "currency": "TJS"
    }
    create_res = await client.post(
        "/api/v1/dishes",
        json=malicious_dish_payload,
        headers=admin_headers
    )
    assert create_res.status_code == 400
    assert "Категория не найдена или принадлежит другому заведению" in create_res.json()["detail"]


@pytest.mark.asyncio
async def test_manager_rbac_cross_branch_isolation(client):
    """
    Test 1.2: Multi-Tenant RBAC isolation.
    A manager of branch A must receive 403 Forbidden when attempting
    to mutate entities of branch B.
    """
    import uuid
    uid = uuid.uuid4().hex[:6]
    token_mgr_a = create_admin_token(role="manager", restaurant_id=101, restaurant_slug="branch-a")
    headers_mgr_a = {"Authorization": f"Bearer {token_mgr_a}"}

    # Manager of 101 attempts to create a category in restaurant 999
    res = await client.post(
        "/api/v1/categories",
        json={
            "restaurant_id": 999,
            "name_translations": {"ru": "Несанкционированная категория"},
            "icon": "alert"
        },
        headers=headers_mgr_a
    )
    assert res.status_code == 403
    assert "Доступ запрещён" in res.json()["detail"]


@pytest.mark.asyncio
async def test_cloned_menu_isolated_media_asset(client, admin_headers):
    """
    Test P0 / 4: Cloning a menu creates isolated MediaAsset records
    preventing 1:1 relationship collisions across distinct restaurants.
    """
    import uuid
    uid = uuid.uuid4().hex[:6]
    donor_slug = f"donor-media-{uid}"
    target_slug = f"target-media-{uid}"

    # 1. Create donor
    res_donor = await client.post(
        "/api/v1/restaurants",
        json={"name": f"Donor {uid}", "slug": donor_slug, "currency": "TJS"},
        headers=admin_headers
    )
    assert res_donor.status_code == 200
    donor_id = res_donor.json()["id"]

    donor_cat = await client.post(
        "/api/v1/categories",
        json={"restaurant_id": donor_id, "name_translations": {"ru": "Стейки"}, "icon": "beef"},
        headers=admin_headers
    )
    assert donor_cat.status_code == 200
    cat_id = donor_cat.json()["id"]

    # Create dummy media asset for donor dish
    from app.core.database import get_session
    from app.models.media import MediaAsset
    session = await get_session()
    async with session:
        donor_media = MediaAsset(
            status="READY",
            original_filename="steak.mp4",
            original_url="/static/videos/steak_orig.mp4",
            poster_lqip_url="/static/videos/steak_lqip.webp",
            poster_hd_url="/static/videos/steak_hd.webp",
            video_mobile_url="/static/videos/steak_mobile.mp4",
            video_kiosk_url="/static/videos/steak_kiosk.mp4",
            duration_seconds=12,
            file_size_bytes=1024000
        )
        session.add(donor_media)
        await session.commit()
        await session.refresh(donor_media)
        donor_media_id = donor_media.id

    # Create dish referencing donor_media_id
    donor_dish = await client.post(
        "/api/v1/dishes",
        json={
            "restaurant_id": donor_id,
            "category_id": cat_id,
            "name_translations": {"ru": "Рибай Стейк"},
            "price": 280.0,
            "media_id": donor_media_id
        },
        headers=admin_headers
    )
    assert donor_dish.status_code == 200

    # 2. Create target branch
    res_target = await client.post(
        "/api/v1/restaurants",
        json={"name": f"Target {uid}", "slug": target_slug, "currency": "USD"},
        headers=admin_headers
    )
    assert res_target.status_code == 200

    # 3. Clone menu
    clone_res = await client.post(
        f"/api/v1/restaurants/{target_slug}/clone-menu-from/{donor_slug}",
        headers=admin_headers
    )
    assert clone_res.status_code == 200

    # 4. Check target menu dish has a NEW cloned MediaAsset id (different from donor)
    target_menu = await client.get(f"/api/v1/restaurants/{target_slug}/full-menu")
    assert target_menu.status_code == 200
    cloned_dish = target_menu.json()["categories"][0]["dishes"][0]
    assert cloned_dish["media"] is not None
    assert cloned_dish["media"]["id"] is not None
    assert cloned_dish["media"]["id"] != donor_media_id, "Cloned dish must have its own MediaAsset instance"


@pytest.mark.asyncio
async def test_stop_list_concurrency_burst(client, admin_headers):
    """
    Test 1.1: Concurrency burst on stop-list toggle with transaction row locks.
    """
    # 1. Get an existing dish
    dishes_res = await client.get("/api/v1/dishes?restaurant_id=1")
    assert dishes_res.status_code == 200
    dishes = dishes_res.json()
    assert len(dishes) > 0
    dish_id = dishes[0]["id"]

    # 2. Execute parallel toggle requests
    tasks = [
        client.patch(f"/api/v1/dishes/{dish_id}/toggle-stop-list", headers=admin_headers)
        for _ in range(10)
    ]
    results = await asyncio.gather(*tasks)

    # All requests must complete cleanly without deadlocks (HTTP 200)
    for r in results:
        assert r.status_code == 200
        assert "is_available" in r.json()


@pytest.mark.asyncio
async def test_master_demo_token_disabled_in_production(client, monkeypatch):
    """
    Test P0 / 2: In production environment, demo_master_token is strictly rejected.
    """
    import app.core.security as sec
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")

    # When environment is production, is_valid_token returns False for demo_master_token
    assert not sec.is_valid_token("demo_master_token")

    res = await client.get(
        "/api/v1/restaurants/asr-royale",
        headers={"Authorization": "Bearer demo_master_token"}
    )
    # The endpoint is public so get works, but on a protected endpoint it must fail:
    res_protected = await client.patch(
        "/api/v1/dishes/1/toggle-stop-list",
        headers={"Authorization": "Bearer demo_master_token"}
    )
    assert res_protected.status_code == 401


@pytest.mark.asyncio
async def test_telegram_html_entity_injection_protection(monkeypatch):
    """
    Test 1.1 / P0: User inputs containing <, >, &, quotes are safely escaped
    and never trigger Telegram Bot API 'Unsupported start tag' entity parsing drops.
    """
    from app.services.telegram_service import TelegramService
    captured_payloads = []

    async def mock_send_message(bot_token, chat_id, text, reply_markup=None):
        captured_payloads.append({"text": text, "reply_markup": reply_markup})
        return True

    monkeypatch.setattr(TelegramService, "send_message", mock_send_message)

    malicious_comment = "Стейк <Medium> без соли & перца <b>инъекция</b>"
    items = [
        {
            "name": "Стейк <Рибай> & Соус",
            "quantity": 2,
            "price": 150.0,
            "chosen_options": [
                {"group": "Прожарка <Raw>", "name": "Medium <Rare> & Соль"}
            ]
        }
    ]

    ok = await TelegramService.notify_service_request(
        bot_token="test_token",
        chat_id="12345",
        restaurant_name="Ресторан <Test & Luxury>",
        table_number="8 <VIP>",
        request_type="order",
        guest_comment=malicious_comment,
        cart_items=items,
        restaurant_currency="TJS & USD"
    )
    assert ok is True
    assert len(captured_payloads) == 1
    sent_text = captured_payloads[0]["text"]

    # Verify that raw tags are converted to safe HTML entities
    assert "&lt;Medium&gt;" in sent_text
    assert "&amp; перца" in sent_text
    assert "&lt;b&gt;инъекция&lt;/b&gt;" in sent_text
    assert "&lt;Рибай&gt;" in sent_text
    assert "&lt;Test &amp; Luxury&gt;" in sent_text
    assert "№ 8 &lt;VIP&gt;" in sent_text


@pytest.mark.asyncio
async def test_query_param_token_rejected_under_owasp(client):
    """
    Test 1.3 / P0: Passing admin token via URL query parameter is rejected (401)
    to prevent token leakage into proxy/browser logs (OWASP API2:2023).
    Only Authorization: Bearer or X-Admin-Token header are accepted.
    """
    from app.core.security import create_admin_token
    token = create_admin_token()

    # 1. URL Query parameter -> 401 Unauthorized
    res_query = await client.patch(f"/api/v1/dishes/1/toggle-stop-list?admin_token={token}")
    assert res_query.status_code == 401

    # 2. Standard Authorization: Bearer header -> 200 OK
    res_bearer = await client.patch(
        "/api/v1/dishes/1/toggle-stop-list",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_bearer.status_code == 200

    # 3. Standard X-Admin-Token header -> 200 OK
    res_header = await client.patch(
        "/api/v1/dishes/1/toggle-stop-list",
        headers={"x-admin-token": token}
    )
    assert res_header.status_code == 200


@pytest.mark.asyncio
async def test_historic_old_slug_exact_search_no_false_positive(client, admin_headers):
    """
    Test 1.2 / P0: Searching by historic slug must match exactly without false positives
    from substring matching (e.g. 'bar' must not match 'lounge-bar').
    """
    import uuid
    uid = uuid.uuid4().hex[:6]
    slug_active = f"new-rest-{uid}"
    slug_old = f"old-lounge-bar-{uid}"

    # Create restaurant with an old slug in array
    from app.core.database import get_session
    from app.models.restaurant import Restaurant
    session = await get_session()
    async with session:
        rest = Restaurant(
            name=f"Lounge {uid}",
            slug=slug_active,
            old_slugs=[slug_old]
        )
        session.add(rest)
        await session.commit()
        await session.refresh(rest)

    # 1. Exact match by old slug -> 200 OK
    res_exact = await client.get(f"/api/v1/restaurants/{slug_old}")
    assert res_exact.status_code == 200
    assert res_exact.json()["slug"] == slug_active

    # 2. Substring 'bar' or partial name -> 404 Not Found (no false positive match)
    res_sub = await client.get(f"/api/v1/restaurants/lounge-bar-{uid}")
    assert res_sub.status_code == 404

