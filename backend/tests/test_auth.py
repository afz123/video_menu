import pytest
from app.api.v1.auth import get_current_admin_password


@pytest.mark.asyncio
async def test_admin_login_success_and_verify(client):
    """Test login with valid admin password returns token, and verify recognizes it."""
    curr_pwd = get_current_admin_password()
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"password": curr_pwd, "slug": "asr-royale"}
    )
    assert login_res.status_code == 200
    data = login_res.json()
    assert data["status"] == "success"
    assert "token" in data
    token = data["token"]

    # Verify token
    verify_res = await client.post(f"/api/v1/auth/verify?token={token}")
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
    assert "Неверный пароль" in login_res.json()["detail"]


@pytest.mark.asyncio
async def test_change_password_validation(client):
    """Test change password validates current password and minimum length."""
    # 1. Wrong current password
    fail_res = await client.post(
        "/api/v1/auth/change-password",
        json={
            "current_password": "wrong_password",
            "new_password": "new_secret_pwd_99"
        }
    )
    assert fail_res.status_code == 400
    assert "Текущий пароль указан неверно" in fail_res.json()["detail"]

    # 2. Too short new password
    curr_pwd = get_current_admin_password()
    short_res = await client.post(
        "/api/v1/auth/change-password",
        json={
            "current_password": curr_pwd,
            "new_password": "ab"
        }
    )
    assert short_res.status_code == 400
    assert "минимум 4 символа" in short_res.json()["detail"]
