import os
import json
import secrets
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
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
    check_restaurant_access,
    check_permission,
    AdminSession
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    password: str
    username: Optional[str] = None
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

    # 0. Персональный логин сотрудника (официант, хостес, повар, управляющий)
    if data.username and data.username.strip():
        u_res = await db.execute(
            select(AdminUser).where(AdminUser.username == data.username.strip(), AdminUser.is_active == True)
        )
        staff_user = u_res.scalars().first()
        if staff_user and (await verify_password_async(pwd, staff_user.password_hash)):
            rest = await db.get(Restaurant, staff_user.restaurant_id) if staff_user.restaurant_id else None
            token = create_admin_token(
                role=staff_user.role,
                permissions=staff_user.permissions or [],
                restaurant_id=staff_user.restaurant_id,
                restaurant_slug=rest.slug if rest else None
            )
            return LoginResponse(
                status="success",
                token=token,
                role=staff_user.role,
                restaurant_id=staff_user.restaurant_id,
                restaurant_slug=rest.slug if rest else None,
                message=f"Авторизация успешна ({staff_user.username} • {staff_user.role})"
            )
        raise HTTPException(status_code=401, detail="Неверный логин или пароль сотрудника")

    # 1. Проверка мастер-пользователя (SuperAdmin) в PostgreSQL
    superadmin_res = await db.execute(
        select(AdminUser).where(AdminUser.role == "superadmin", AdminUser.is_active == True)
    )
    master_admin = superadmin_res.scalars().first()
    if master_admin and master_admin.password_hash:
        if await verify_password_async(pwd, master_admin.password_hash):
            token = create_admin_token(role="superadmin", permissions=["*"])
            return LoginResponse(
                status="success",
                token=token,
                role="superadmin",
                message="Авторизация успешна (Владелец сети / SuperAdmin)"
            )

    # Резервный фоллбэк на get_current_admin_password / env для обратной совместимости
    master_pwd = get_current_admin_password()
    if pwd == master_pwd:
        token = create_admin_token(role="superadmin", permissions=["*"])
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
                    permissions=mgr.permissions or ["*"],
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
                    permissions=["*"],
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


# -------------------------------------------------------------
# Staff & RBAC Management Endpoints
# -------------------------------------------------------------

class CreateStaffRequest(BaseModel):
    username: str
    password: str
    role: str = "waiter"  # manager, hostess, waiter, chef
    permissions: List[str] = ["view_menu", "toggle_stop_list", "resolve_requests"]
    restaurant_slug: str


class UpdateStaffRequest(BaseModel):
    role: Optional[str] = None
    permissions: Optional[List[str]] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/staff")
@router.get("/users")
async def list_staff_members(
    restaurant_slug: str,
    current_admin: AdminSession = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    rest = (await db.execute(select(Restaurant).where(Restaurant.slug == restaurant_slug))).scalar_one_or_none()
    if not rest:
        raise HTTPException(status_code=404, detail="Заведение не найдено")
    check_restaurant_access(current_admin, rest.id)

    res = await db.execute(select(AdminUser).where(AdminUser.restaurant_id == rest.id))
    users = res.scalars().all()
    return [{
        "id": u.id,
        "username": u.username,
        "role": u.role,
        "permissions": u.permissions or [],
        "is_active": u.is_active,
        "created_at": u.created_at.isoformat() if u.created_at else None
    } for u in users]


@router.post("/staff")
@router.post("/users")
async def create_staff_member(
    data: CreateStaffRequest,
    current_admin: AdminSession = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    check_permission(current_admin, "manage_staff")
    rest = (await db.execute(select(Restaurant).where(Restaurant.slug == data.restaurant_slug))).scalar_one_or_none()
    if not rest:
        raise HTTPException(status_code=404, detail="Заведение не найдено")
    check_restaurant_access(current_admin, rest.id)

    # Проверка уникальности логина
    exists = (await db.execute(select(AdminUser).where(AdminUser.username == data.username.strip()))).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=400, detail="Сотрудник с таким логином уже зарегистрирован")

    pwd_hash = await hash_password_async(data.password.strip())
    new_user = AdminUser(
        username=data.username.strip(),
        password_hash=pwd_hash,
        role=data.role,
        permissions=data.permissions,
        restaurant_id=rest.id,
        is_active=True
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return {
        "status": "created",
        "id": new_user.id,
        "username": new_user.username,
        "role": new_user.role,
        "permissions": new_user.permissions
    }


@router.put("/staff/{user_id}")
@router.put("/users/{user_id}")
async def update_staff_member(
    user_id: int,
    data: UpdateStaffRequest,
    current_admin: AdminSession = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    check_permission(current_admin, "manage_staff")
    user = await db.get(AdminUser, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Сотрудник не найден")
    check_restaurant_access(current_admin, user.restaurant_id)

    if data.role is not None:
        user.role = data.role
    if data.permissions is not None:
        user.permissions = data.permissions
    if data.is_active is not None:
        user.is_active = data.is_active
    if data.password and data.password.strip():
        user.password_hash = await hash_password_async(data.password.strip())

    await db.commit()
    await db.refresh(user)
    return {
        "status": "updated",
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "permissions": user.permissions,
        "is_active": user.is_active
    }


@router.delete("/staff/{user_id}")
@router.delete("/users/{user_id}")
async def delete_staff_member(
    user_id: int,
    current_admin: AdminSession = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    check_permission(current_admin, "manage_staff")
    user = await db.get(AdminUser, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Сотрудник не найден")
    check_restaurant_access(current_admin, user.restaurant_id)
    await db.delete(user)
    await db.commit()
    return {"status": "deleted", "id": user_id}
