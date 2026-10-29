import uuid
import pytest
from httpx import AsyncClient
from app.models.restaurant import Restaurant
from app.models.dish import Dish
from app.models.category import Category

@pytest.mark.asyncio
async def test_staff_crud_and_rbac_permissions(client: AsyncClient, admin_headers: dict):
    headers_super = admin_headers

    # 1. Create a restaurant for testing with unique slug
    unique_suffix = uuid.uuid4().hex[:6]
    rest_slug = f"staff-bistro-{unique_suffix}"
    rest_data = {
        "name": f"Staff Test Bistro {unique_suffix}",
        "slug": rest_slug,
        "theme_config": {"primary_color": "#d4af37"}
    }
    r_resp = await client.post("/api/v1/restaurants", json=rest_data, headers=headers_super)
    assert r_resp.status_code == 200
    restaurant_id = r_resp.json()["id"]

    # Create category and dish
    cat_resp = await client.post(
        "/api/v1/categories",
        json={"name_translations": {"ru": "Закуски"}, "restaurant_id": restaurant_id, "display_order": 1},
        headers=headers_super
    )
    assert cat_resp.status_code == 200
    category_id = cat_resp.json()["id"]

    dish_resp = await client.post(
        "/api/v1/dishes",
        json={
            "restaurant_id": restaurant_id,
            "category_id": category_id,
            "name_translations": {"ru": "Тартар из тунца"},
            "price": 85.0,
            "is_available": True
        },
        headers=headers_super
    )
    assert dish_resp.status_code == 200
    dish_id = dish_resp.json()["id"]

    # 2. Superadmin creates a staff member (waiter with toggle_stop_list, but no edit_dish)
    waiter_username = f"waiter_{unique_suffix}"
    waiter_password = "secure_waiter_pwd_123"
    staff_create_data = {
        "username": waiter_username,
        "password": waiter_password,
        "role": "waiter",
        "permissions": ["view_menu", "toggle_stop_list", "resolve_requests"],
        "restaurant_slug": rest_slug
    }
    create_staff_resp = await client.post("/api/v1/auth/staff", json=staff_create_data, headers=headers_super)
    assert create_staff_resp.status_code == 200
    staff_id = create_staff_resp.json()["id"]

    # 3. List staff members
    list_staff_resp = await client.get(f"/api/v1/auth/staff?restaurant_slug={rest_slug}", headers=headers_super)
    assert list_staff_resp.status_code == 200
    staff_members = list_staff_resp.json()
    assert any(s["username"] == waiter_username for s in staff_members)

    # 4. Waiter logs in using personal credentials
    login_resp = await client.post("/api/v1/auth/login", json={
        "username": waiter_username,
        "password": waiter_password,
        "slug": rest_slug
    })
    assert login_resp.status_code == 200
    waiter_token = login_resp.json()["token"]
    assert login_resp.json()["role"] == "waiter"

    headers_waiter = {"Authorization": f"Bearer {waiter_token}"}

    # 5. Waiter CAN toggle stop list
    toggle_resp = await client.patch(f"/api/v1/dishes/{dish_id}/toggle-stop-list", headers=headers_waiter)
    assert toggle_resp.status_code == 200
    assert toggle_resp.json()["is_available"] is False

    # 6. Waiter CANNOT edit or delete dishes (RBAC 403 Forbidden)
    edit_resp = await client.put(f"/api/v1/dishes/{dish_id}", json={"price": 120.0}, headers=headers_waiter)
    assert edit_resp.status_code == 403
    assert "Недостаточно прав" in edit_resp.json()["detail"]

    del_resp = await client.delete(f"/api/v1/dishes/{dish_id}", headers=headers_waiter)
    assert del_resp.status_code == 403

    # 7. Update staff member (promote or add permission)
    update_staff_resp = await client.put(
        f"/api/v1/auth/staff/{staff_id}",
        json={"permissions": ["view_menu", "toggle_stop_list", "resolve_requests", "edit_dish"]},
        headers=headers_super
    )
    assert update_staff_resp.status_code == 200
    assert "edit_dish" in update_staff_resp.json()["permissions"]

    # 8. Delete staff member
    del_staff_resp = await client.delete(f"/api/v1/auth/staff/{staff_id}", headers=headers_super)
    assert del_staff_resp.status_code == 200
    assert del_staff_resp.json()["status"] == "deleted"
