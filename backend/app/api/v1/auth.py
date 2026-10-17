import os
import json
import secrets
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from app.core.config import settings
from app.core.security import (
    create_admin_token,
    revoke_admin_token,
    is_valid_token,
    get_current_admin
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    password: str
    slug: Optional[str] = "asr-royale"

class LoginResponse(BaseModel):
    status: str
    token: str
    message: str

class VerifyTokenRequest(BaseModel):
    token: Optional[str] = None

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

@router.post("/login", response_model=LoginResponse)
async def admin_login(data: LoginRequest):
    pwd = data.password.strip()
    current_pwd = get_current_admin_password()
    if pwd == current_pwd:
        token = create_admin_token()
        return LoginResponse(
            status="success",
            token=token,
            message="Авторизация успешна"
        )
    
    raise HTTPException(status_code=401, detail="Неверный пароль администратора")

@router.post("/verify")
async def verify_token(req: Optional[VerifyTokenRequest] = None):
    token = req.token if req else None
    if token and is_valid_token(token):
        return {"valid": True}
    return {"valid": False}

@router.post("/change-password")
async def change_admin_password(
    data: ChangePasswordRequest,
    current_admin: str = Depends(get_current_admin)
):
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
async def admin_logout(req: Optional[VerifyTokenRequest] = None):
    if req and req.token:
        revoke_admin_token(req.token)
    return {"status": "logged_out"}

