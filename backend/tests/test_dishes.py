import pytest


@pytest.mark.asyncio
async def test_list_dishes(client):
    """Test retrieving dishes list (public endpoint)."""
    response = await client.get("/api/v1/dishes?restaurant_id=1")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    dish = data[0]
    assert "id" in dish
    assert "name_translations" in dish
    assert "description_translations" in dish
    assert "price" in dish
    assert "currency" in dish
    assert "badges" in dish
    assert "modifiers" in dish


@pytest.mark.asyncio
async def test_dish_mutations_require_auth(client):
    """Test creating, updating, or deleting dish without auth returns 401."""
    res_create = await client.post("/api/v1/dishes", json={"name_translations": {"ru": "Тест"}})
    assert res_create.status_code == 401

    res_toggle = await client.patch("/api/v1/dishes/1/toggle-stop-list")
    assert res_toggle.status_code == 401

    res_del = await client.delete("/api/v1/dishes/99999")
    assert res_del.status_code == 401


@pytest.mark.asyncio
async def test_create_and_update_dish_with_modifiers_and_badges(client, admin_headers):
    """
    Test creating and updating dish with nested multi-lingual structured description fields,
    dynamic badges, modifiers, and pairings.
    """
    # 1. First get a valid category_id
    cat_res = await client.get("/api/v1/categories?restaurant_id=1")
    assert cat_res.status_code == 200
    categories = cat_res.json()
    assert len(categories) > 0
    cat_id = categories[0]["id"]

    # 2. Create dish with structured translations, badges and modifiers
    create_payload = {
        "restaurant_id": 1,
        "category_id": cat_id,
        "name_translations": {
            "ru": "Филе-миньон Трюфель",
            "en": "Filet Mignon Truffle",
            "tj": "Филе-миньон Бо Замбӯруғ"
        },
        "description_translations": {
            "ru": {
                "description": "Нежнейшая вырезка зернового откорма",
                "ingredients": "Говядина Prime, трюфельное масло, морская соль",
                "serving": "Подается с соусом порто и розмарином"
            }
        },
        "badges": ["Хит", "Выбор Шефа"],
        "modifiers": [
            {
                "id": "doneness",
                "name": "Степень прожарки",
                "type": "single",
                "required": True,
                "options": [
                    {"name": "Medium Rare", "price": 0},
                    {"name": "Medium", "price": 0}
                ]
            }
        ],
        "pairings": [{"text": "Бокал Malbec (120 TJS)"}],
        "price": 320.0,
        "currency": "TJS",
        "weight_info": "350г",
        "calories_info": "420 ккал",
        "allergens": ["трюфель"],
        "is_available": True
    }

    create_res = await client.post("/api/v1/dishes", json=create_payload, headers=admin_headers)
    assert create_res.status_code == 200, f"Create dish failed: {create_res.text}"
    created_dish = create_res.json()
    dish_id = created_dish["id"]
    assert created_dish["name_translations"]["ru"] == "Филе-миньон Трюфель"
    assert created_dish["badges"] == ["Хит", "Выбор Шефа"]
    assert len(created_dish["modifiers"]) == 1
    assert created_dish["modifiers"][0]["name"] == "Степень прожарки"

    # 3. 1-Click stop-list toggle
    toggle_res = await client.patch(f"/api/v1/dishes/{dish_id}/toggle-stop-list", headers=admin_headers)
    assert toggle_res.status_code == 200
    assert toggle_res.json()["is_available"] is False

    # 4. Clean up test dish
    del_res = await client.delete(f"/api/v1/dishes/{dish_id}", headers=admin_headers)
    assert del_res.status_code == 200
