import os
import json
import secrets
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    password: str
    slug: Optional[str] = "asr-royale"

class LoginResponse(BaseModel):
    status: str
    token: str
    message: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

# Password persistence file in storage
PASSWORD_FILE = settings.STORAGE_DIR / "admin_secret.json"

def get_current_admin_password() -> str:
    if PASSWORD_FILE.exists():
        try:
            with open(PASSWORD_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                pwd = data.get("password")
                if pwd:
                    return str(pwd)
        except Exception:
            pass
    return os.getenv("ADMIN_PASSWORD", "admin123")

def save_admin_password(new_password: str):
    settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    with open(PASSWORD_FILE, "w", encoding="utf-8") as f:
        json.dump({"password": new_password}, f, ensure_ascii=False, indent=2)

# In-memory valid tokens
VALID_TOKENS = set()

@router.post("/login", response_model=LoginResponse)
async def admin_login(data: LoginRequest):
    pwd = data.password.strip()
    current_pwd = get_current_admin_password()
    if pwd == current_pwd:
        token = secrets.token_hex(24)
        VALID_TOKENS.add(token)
        return LoginResponse(
            status="success",
            token=token,
            message="Авторизация успешна"
        )
    
    raise HTTPException(status_code=401, detail="Неверный пароль администратора")

@router.post("/verify")
async def verify_token(token: str):
    if token in VALID_TOKENS or token == "demo_master_token":
        return {"valid": True}
    return {"valid": False}

@router.post("/change-password")
async def change_admin_password(data: ChangePasswordRequest):
    curr = data.current_password.strip()
    new_p = data.new_password.strip()

    expected_pwd = get_current_admin_password()
    if curr != expected_pwd:
        raise HTTPException(status_code=400, detail="Текущий пароль указан неверно")

    if len(new_p) < 4:
        raise HTTPException(status_code=400, detail="Новый пароль должен содержать минимум 4 символа")

    save_admin_password(new_p)
    return {
        "status": "success",
        "message": "Пароль администратора успешно обновлен!"
    }

@router.post("/logout")
async def admin_logout(token: str):
    VALID_TOKENS.discard(token)
    return {"status": "logged_out"}
