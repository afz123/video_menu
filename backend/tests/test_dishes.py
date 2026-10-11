import pytest


@pytest.mark.asyncio
async def test_list_dishes(client):
    """Test retrieving dishes list."""
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


@pytest.mark.asyncio
async def test_create_and_update_dish_with_nested_descriptions(client):
    """
    Test creating and updating dish with nested multi-lingual structured description fields:
    { description: '...', ingredients: '...', serving: '...' }
    Verifies that no 422 Unprocessable Entity regression occurs.
    """
    # 1. First get a valid category_id
    cat_res = await client.get("/api/v1/categories?restaurant_id=1")
    assert cat_res.status_code == 200
    categories = cat_res.json()
    assert len(categories) > 0
    cat_id = categories[0]["id"]

    # 2. Create dish with structured translations
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
            },
            "en": {
                "description": "Tender grain-fed tenderloin",
                "ingredients": "Prime beef, truffle oil, sea salt",
                "serving": "Served with port wine reduction and rosemary"
            },
            "tj": {
                "description": "Гӯшти лазизи беустухон",
                "ingredients": "Гӯшти Prime, равғани трюфел, намаки баҳрӣ",
                "serving": "Бо чошнии порто пешкаш мешавад"
            }
        },
        "price": 320.0,
        "currency": "TJS",
        "weight_info": "350г",
        "calories_info": "420 ккал",
        "allergens": ["трюфель"],
        "is_available": True
    }

    create_res = await client.post("/api/v1/dishes", json=create_payload)
    assert create_res.status_code == 200, f"Create dish failed: {create_res.text}"
    created_dish = create_res.json()
    dish_id = created_dish["id"]
    assert created_dish["name_translations"]["ru"] == "Филе-миньон Трюфель"
    assert isinstance(created_dish["description_translations"], dict)
    assert created_dish["description_translations"]["ru"]["ingredients"] == "Говядина Prime, трюфельное масло, морская соль"

    # 3. Update dish with modified nested fields (similar to DishFormModal PUT call)
    update_payload = {
        "price": 340.0,
        "description_translations": {
            "ru": {
                "description": "Нежнейшая вырезка премиального откорма",
                "ingredients": "Говядина Prime, черные трюфели, Fleur de Sel",
                "serving": "Подается с дымком из вишневой щепы"
            },
            "en": {
                "description": "Ultra tender beef tenderloin",
                "ingredients": "Prime beef, black truffles, Fleur de Sel",
                "serving": "Infused with cherry wood smoke"
            }
        },
        "weight_info": "380г",
        "is_available": True
    }

    update_res = await client.put(f"/api/v1/dishes/{dish_id}", json=update_payload)
    assert update_res.status_code == 200, f"Update dish failed: {update_res.text}"
    updated_dish = update_res.json()
    assert updated_dish["price"] == 340.0
    assert updated_dish["weight_info"] == "380г"
    assert updated_dish["description_translations"]["ru"]["ingredients"] == "Говядина Prime, черные трюфели, Fleur de Sel"

    # 4. Cleanup
    del_res = await client.delete(f"/api/v1/dishes/{dish_id}")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "deleted"
