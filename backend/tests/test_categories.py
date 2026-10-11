import pytest


@pytest.mark.asyncio
async def test_list_categories(client):
    """Test retrieving categories for restaurant."""
    response = await client.get("/api/v1/categories?restaurant_id=1")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    for cat in data:
        assert "id" in cat
        assert "name_translations" in cat
        assert "restaurant_id" in cat


@pytest.mark.asyncio
async def test_create_and_update_category(client):
    """Test creating, updating, and deleting a category."""
    # Create
    create_payload = {
        "restaurant_id": 1,
        "name_translations": {
            "ru": "Тестовый Раздел",
            "en": "Test Section",
            "tj": "Бахши санҷишӣ"
        },
        "display_order": 99,
        "is_active": True
    }
    create_res = await client.post("/api/v1/categories", json=create_payload)
    assert create_res.status_code == 200
    cat_data = create_res.json()
    cat_id = cat_data["id"]
    assert cat_data["name_translations"]["ru"] == "Тестовый Раздел"

    # Update
    update_res = await client.put(
        f"/api/v1/categories/{cat_id}",
        json={
            "name_translations": {
                "ru": "Обновленный Тестовый Раздел",
                "en": "Updated Test Section",
                "tj": "Бахши санҷишии навшуда"
            },
            "display_order": 100
        }
    )
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["name_translations"]["ru"] == "Обновленный Тестовый Раздел"
    assert updated_data["display_order"] == 100

    # Delete
    del_res = await client.delete(f"/api/v1/categories/{cat_id}")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "deleted"

    # Confirm not found
    get_res = await client.put(f"/api/v1/categories/{cat_id}", json={"display_order": 1})
    assert get_res.status_code == 404
