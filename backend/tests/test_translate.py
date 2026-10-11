import pytest


@pytest.mark.asyncio
async def test_translate_same_language(client):
    """Test translating to the same source language returns original text immediately."""
    payload = {
        "source_lang": "ru",
        "target_langs": ["ru"],
        "fields": {
            "name": "Шашлык из баранины",
            "description": "Свежее мясо на углях"
        }
    }
    response = await client.post("/api/v1/translate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "translations" in data
    assert "ru" in data["translations"]
    assert data["translations"]["ru"]["name"] == "Шашлык из баранины"
    assert data["translations"]["ru"]["description"] == "Свежее мясо на углях"


@pytest.mark.asyncio
async def test_translate_russian_to_english_and_tajik(client):
    """Test translating fields to English and Tajik."""
    payload = {
        "source_lang": "ru",
        "target_langs": ["en", "tj"],
        "fields": {
            "name": "Стейк Рибай",
            "description": "Мясо высшего сорта",
            "ingredients": "Говядина, соль, перец",
            "serving": "На чугунной сковороде"
        }
    }
    response = await client.post("/api/v1/translate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "translations" in data
    assert "en" in data["translations"]
    assert "tj" in data["translations"]

    en_trans = data["translations"]["en"]
    tj_trans = data["translations"]["tj"]

    # Verify translated fields exist and are non-empty
    assert len(en_trans["name"]) > 0
    assert len(en_trans["description"]) > 0
    assert len(en_trans["ingredients"]) > 0
    assert len(en_trans["serving"]) > 0

    assert len(tj_trans["name"]) > 0
    assert len(tj_trans["description"]) > 0


@pytest.mark.asyncio
async def test_translate_empty_fields(client):
    """Test translation handles empty strings properly without crashing."""
    payload = {
        "source_lang": "ru",
        "target_langs": ["en"],
        "fields": {
            "name": "",
            "description": "",
            "ingredients": "",
            "serving": ""
        }
    }
    response = await client.post("/api/v1/translate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["translations"]["en"]["name"] == ""
