import pytest


@pytest.mark.asyncio
async def test_admin_login_success_and_verify(client):
    """Test login with valid superadmin credentials returns token, and verify recognizes it."""
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"username": "superadmin", "password": "admin123"}
    )
    assert login_res.status_code == 200
    data = login_res.json()
    assert data["status"] == "success"
    assert "token" in data
    token = data["token"]

    # Verify token via JSON body
    verify_res = await client.post("/api/v1/auth/verify", json={"token": token})
    assert verify_res.status_code == 200
    assert verify_res.json()["valid"] is True


@pytest.mark.asyncio
async def test_admin_login_invalid_password(client):
    """Test login with wrong password returns 401."""
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"password": "incorrect_wrong_password_12345", "slug": "asr-royale"}
    )
    assert login_res.status_code == 401
    assert "Неверный" in login_res.json()["detail"]


@pytest.mark.asyncio
async def test_change_password_requires_auth(client):
    """Test change password without admin auth returns 401."""
    res = await client.post(
        "/api/v1/auth/change-password",
        json={
            "current_password": "wrong_password",
            "new_password": "new_secret_pwd_99"
        }
    )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_superadmin_login_immutable_hash(client, monkeypatch):
    """Test superadmin login using immutable hash."""
    from app.core import security
    monkeypatch.setattr(
        security,
        "IMMUTABLE_SUPERADMIN_HASH",
        "e4ec24d78f805264f02739814f14078c$64351ad15ac6264bfd3da877339ff0ecf515d7a80580cbad3372c2a2c590d572"
    )
    res = await client.post(
        "/api/v1/auth/login",
        json={"username": "superadmin", "password": "МойСекретныйПароль2026"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["role"] == "superadmin"
    assert "token" in data

    # Incorrect superadmin password returns 401
    bad_res = await client.post(
        "/api/v1/auth/login",
        json={"username": "superadmin", "password": "wrong_password"}
    )
    assert bad_res.status_code == 401
    assert "Неверный пароль Супер-Админа" in bad_res.json()["detail"]


@pytest.mark.asyncio
async def test_change_password_superadmin_forbidden(client, admin_headers):
    """Test superadmin change network master password is forbidden by hardware immutable lock."""
    res = await client.post(
        "/api/v1/auth/change-password",
        json={
            "current_password": "МойСекретныйПароль2026",
            "new_password": "new_secret_pwd_99"
        },
        headers=admin_headers
    )
    assert res.status_code == 403
    assert "Пароль Супер-Админа аппаратно зашит" in res.json()["detail"]
