import os
import json
import secrets
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db
from app.models.restaurant import Restaurant
from app.models.admin_user import AdminUser
from app.core.security import (
    create_admin_token,
    revoke_admin_token,
    is_valid_token,
    get_current_admin,
    hash_password,
    verify_password,
    hash_password_async,
    verify_password_async,
    AdminSession
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    password: str
    slug: Optional[str] = None


class LoginResponse(BaseModel):
    status: str
    token: str
    role: str = "superadmin"
    restaurant_id: Optional[int] = None
    restaurant_slug: Optional[str] = None
    message: str


class VerifyTokenRequest(BaseModel):
    token: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    restaurant_slug: Optional[str] = None


# Global master admin password persistence file in storage
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
async def admin_login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    pwd = data.password.strip()

    # 1. Проверка мастер-пользователя (SuperAdmin) в PostgreSQL
    superadmin_res = await db.execute(
        select(AdminUser).where(AdminUser.role == "superadmin", AdminUser.is_active == True)
    )
    master_admin = superadmin_res.scalars().first()
    if master_admin and master_admin.password_hash:
        if await verify_password_async(pwd, master_admin.password_hash):
            token = create_admin_token(role="superadmin")
            return LoginResponse(
                status="success",
                token=token,
                role="superadmin",
                message="Авторизация успешна (Владелец сети / SuperAdmin)"
            )

    # Резервный фоллбэк на get_current_admin_password / env для обратной совместимости
    master_pwd = get_current_admin_password()
    if pwd == master_pwd:
        token = create_admin_token(role="superadmin")
        return LoginResponse(
            status="success",
            token=token,
            role="superadmin",
            message="Авторизация успешна (Владелец сети / SuperAdmin)"
        )

    # 2. Проверка доступа управляющего (Manager) для конкретного заведения
    if data.slug:
        res = await db.execute(select(Restaurant).where(Restaurant.slug == data.slug.strip()))
        rest = res.scalar_one_or_none()
        if rest:
            # Проверяем таблицу admin_users для этого ресторана
            mgr_res = await db.execute(
                select(AdminUser).where(
                    AdminUser.restaurant_id == rest.id,
                    AdminUser.is_active == True
                )
            )
            mgr = mgr_res.scalars().first()
            if mgr and mgr.password_hash and (await verify_password_async(pwd, mgr.password_hash)):
                token = create_admin_token(
                    role="manager",
                    restaurant_id=rest.id,
                    restaurant_slug=rest.slug
                )
                return LoginResponse(
                    status="success",
                    token=token,
                    role="manager",
                    restaurant_id=rest.id,
                    restaurant_slug=rest.slug,
                    message=f"Авторизация успешна (Управляющий филиала: {rest.name})"
                )

            # Также проверяем rest.admin_password_hash
            if rest.admin_password_hash and (await verify_password_async(pwd, rest.admin_password_hash)):
                token = create_admin_token(
                    role="manager",
                    restaurant_id=rest.id,
                    restaurant_slug=rest.slug
                )
                return LoginResponse(
                    status="success",
                    token=token,
                    role="manager",
                    restaurant_id=rest.id,
                    restaurant_slug=rest.slug,
                    message=f"Авторизация успешна (Управляющий филиала: {rest.name})"
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
    current_admin: AdminSession = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    curr = data.current_password.strip()
    new_p = data.new_password.strip()

    if len(new_p) < 4:
        raise HTTPException(status_code=400, detail="Новый пароль должен содержать минимум 4 символа")

    # If manager of a specific branch
    if getattr(current_admin, "role", None) == "manager" and getattr(current_admin, "restaurant_id", None):
        rest = await db.get(Restaurant, current_admin.restaurant_id)
        if not rest:
            raise HTTPException(status_code=404, detail="Заведение не найдено")
        if not rest.admin_password_hash or not (await verify_password_async(curr, rest.admin_password_hash)):
            raise HTTPException(status_code=400, detail="Текущий пароль филиала указан неверно")

        new_hash = await hash_password_async(new_p)
        rest.admin_password_hash = new_hash

        # Синхронизация с таблицей admin_users
        mgr_res = await db.execute(select(AdminUser).where(AdminUser.restaurant_id == rest.id))
        mgr_user = mgr_res.scalars().first()
        if not mgr_user:
            mgr_user = AdminUser(
                username=f"manager_{rest.slug}",
                password_hash=new_hash,
                role="manager",
                restaurant_id=rest.id,
                is_active=True
            )
            db.add(mgr_user)
        else:
            mgr_user.password_hash = new_hash

        await db.commit()
        return {
            "status": "success",
            "message": f"Пароль управляющего для '{rest.name}' успешно обновлен!"
        }

    # If superadmin changing a specific restaurant's password
    if data.restaurant_slug:
        res = await db.execute(select(Restaurant).where(Restaurant.slug == data.restaurant_slug.strip()))
        target_rest = res.scalar_one_or_none()
        if not target_rest:
            raise HTTPException(status_code=404, detail="Указанное заведение не найдено")
        new_hash = await hash_password_async(new_p)
        target_rest.admin_password_hash = new_hash

        mgr_res = await db.execute(select(AdminUser).where(AdminUser.restaurant_id == target_rest.id))
        mgr_user = mgr_res.scalars().first()
        if not mgr_user:
            mgr_user = AdminUser(
                username=f"manager_{target_rest.slug}",
                password_hash=new_hash,
                role="manager",
                restaurant_id=target_rest.id,
                is_active=True
            )
            db.add(mgr_user)
        else:
            mgr_user.password_hash = new_hash

        await db.commit()
        return {
            "status": "success",
            "message": f"Пароль для '{target_rest.name}' успешно обновлен владельцем сети!"
        }

    # Otherwise superadmin updating network master password in Database
    superadmin_res = await db.execute(
        select(AdminUser).where(AdminUser.role == "superadmin", AdminUser.is_active == True)
    )
    master_admin = superadmin_res.scalars().first()
    is_valid = False
    if master_admin and master_admin.password_hash:
        is_valid = await verify_password_async(curr, master_admin.password_hash)
    if not is_valid:
        is_valid = (curr == get_current_admin_password())

    if not is_valid:
        raise HTTPException(status_code=400, detail="Текущий пароль указан неверно")

    new_hash = await hash_password_async(new_p)
    if not master_admin:
        master_admin = AdminUser(
            username="superadmin",
            password_hash=new_hash,
            role="superadmin",
            restaurant_id=None,
            is_active=True
        )
        db.add(master_admin)
    else:
        master_admin.password_hash = new_hash

    await db.commit()
    # Also update backup file if storage is present
    try:
        save_admin_password(new_p)
    except Exception:
        pass

    return {
        "status": "success",
        "message": "Мастер-пароль сети ресторанов успешно обновлен в базе данных!"
    }


@router.post("/logout")
async def admin_logout(req: Optional[VerifyTokenRequest] = None):
    if req and req.token:
        revoke_admin_token(req.token)
    return {"status": "logged_out"}
