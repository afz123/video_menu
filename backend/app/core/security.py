import json
import os
import secrets
import hashlib
import hmac
import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import jwt
from fastapi import HTTPException, Security, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings

logger = logging.getLogger("video_menu.security")

# Зашитый в бинарный код хэш Супер-Админа (не изменяется через БД)
IMMUTABLE_SUPERADMIN_HASH = os.getenv(
    "IMMUTABLE_SUPERADMIN_HASH",
    "e4ec24d78f805264f02739814f14078c$64351ad15ac6264bfd3da877339ff0ecf515d7a80580cbad3372c2a2c590d572"
)

MASTER_DEMO_TOKEN = "demo_master_token"

def _is_dev_environment() -> bool:
    env = getattr(settings, "ENVIRONMENT", "production").lower()
    return env in ("development", "dev", "test", "testing")

ALLOW_MASTER_DEMO_TOKEN: bool = _is_dev_environment()

security_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str, salt: Optional[str] = None) -> str:
    """Cryptographically secure PBKDF2-HMAC-SHA256 password hashing (synchronous)."""
    if not salt:
        salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000
    ).hex()
    return f"{salt}${hashed}"


async def hash_password_async(password: str, salt: Optional[str] = None) -> str:
    """Async PBKDF2-HMAC-SHA256 password hashing via thread pool to prevent Event Loop stalls."""
    def _compute():
        nonlocal salt
        if not salt:
            salt = secrets.token_hex(16)
        hashed = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000
        ).hex()
        return f"{salt}${hashed}"
    return await asyncio.to_thread(_compute)


def verify_password(password: str, password_hash: Optional[str]) -> bool:
    """Verifies a plain password against a stored PBKDF2 hash (synchronous)."""
    if not password_hash or "$" not in password_hash:
        return False
    try:
        salt, hashed = password_hash.split("$", 1)
        test_hash = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000
        ).hex()
        if secrets.compare_digest(hashed, test_hash):
            return True
        if secrets.compare_digest(hashed, hashlib.sha256(password.encode("utf-8")).hexdigest()):
            return True
        return False
    except Exception:
        return False


async def verify_password_async(password: str, password_hash: Optional[str]) -> bool:
    """Async PBKDF2 password verification via thread pool to prevent Event Loop freezing."""
    if not password_hash or "$" not in password_hash:
        return False
    def _compute():
        try:
            salt, hashed = password_hash.split("$", 1)
            test_hash = hashlib.pbkdf2_hmac(
                "sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000
            ).hex()
            if secrets.compare_digest(hashed, test_hash):
                return True
            if secrets.compare_digest(hashed, hashlib.sha256(password.encode("utf-8")).hexdigest()):
                return True
            return False
        except Exception:
            return False
    return await asyncio.to_thread(_compute)


def generate_table_signature(restaurant_id: int, table: str) -> str:
    """Generates an HMAC-SHA256 16-char hex signature for QR table verification."""
    secret = settings.QR_SECRET_KEY
    normalized_table = str(table).strip()
    return hmac.new(
        secret.encode("utf-8"),
        f"{restaurant_id}:{normalized_table}".encode("utf-8"),
        hashlib.sha256
    ).hexdigest()[:16]


def verify_table_signature(restaurant_id: int, table: str, token: Optional[str]) -> bool:
    """Verifies HMAC digital signature of table number to prevent tampering/spoofing."""
    if not token or not str(token).strip():
        return False
    expected = generate_table_signature(restaurant_id, str(table).strip())
    return hmac.compare_digest(expected, str(token).strip())


class AdminSession(str):
    """
    Subclasses str so that any code expecting a string token continues
    to work seamlessly, while exposing multi-tenant context attributes and permissions.
    """
    role: str = "superadmin"
    permissions: list = []
    restaurant_id: Optional[int] = None
    restaurant_slug: Optional[str] = None

    def __new__(
        cls,
        token: str,
        role: str = "superadmin",
        permissions: Optional[list] = None,
        restaurant_id: Optional[int] = None,
        restaurant_slug: Optional[str] = None
    ):
        instance = super().__new__(cls, token)
        instance.role = role
        instance.permissions = permissions or []
        instance.restaurant_id = restaurant_id
        instance.restaurant_slug = restaurant_slug
        return instance

def check_permission(admin: Any, required_perm: str):
    role = getattr(admin, "role", "superadmin")
    if role in ("superadmin", "manager"):
        return
    perms = getattr(admin, "permissions", [])
    if "*" in perms or required_perm in perms:
        return
    if required_perm in ("edit_dish", "edit_dishes") and any(p in perms for p in ("edit_dish", "edit_dishes")):
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"Недостаточно прав: требуется разрешение '{required_perm}'"
    )


# Revocation blacklist for JWT tokens (in-memory, no disk files)
REVOKED_TOKENS: set = set()


def create_admin_token(
    role: str = "superadmin",
    permissions: Optional[list] = None,
    restaurant_id: Optional[int] = None,
    restaurant_slug: Optional[str] = None
) -> str:
    """
    Creates a stateless cryptographically signed JWT token with standard claims.
    No filesystem writes or locks required.
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=getattr(settings, "JWT_EXPIRE_DAYS", 30))
    payload = {
        "sub": f"admin_{role}",
        "jti": secrets.token_hex(16),
        "role": role,
        "permissions": permissions or (["*"] if role == "superadmin" else ["view_menu", "toggle_stop_list", "resolve_requests"]),
        "restaurant_id": restaurant_id,
        "restaurant_slug": restaurant_slug,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp())
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_admin_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates a signed JWT admin token."""
    if not token or token in REVOKED_TOKENS:
        return None
    if _is_dev_environment() and token == MASTER_DEMO_TOKEN:
        return {
            "role": "superadmin",
            "permissions": ["*"],
            "restaurant_id": None,
            "restaurant_slug": None
        }
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except Exception:
        return None


def revoke_admin_token(token: str):
    """Revokes a JWT token by adding it to the blacklist."""
    if token:
        REVOKED_TOKENS.add(token)


def is_valid_token(token: str) -> bool:
    """Validates if token signature and expiration are correct."""
    return decode_admin_token(token) is not None


def get_admin_session(token: str) -> Optional[AdminSession]:
    """Builds AdminSession from verified JWT payload."""
    payload = decode_admin_token(token)
    if not payload:
        return None
    return AdminSession(
        token=token,
        role=payload.get("role", "superadmin"),
        permissions=payload.get("permissions", []),
        restaurant_id=payload.get("restaurant_id"),
        restaurant_slug=payload.get("restaurant_slug")
    )


def check_restaurant_access(admin: Any, restaurant_id: int):
    """
    Prevents cross-tenant IDOR attacks.
    Superadmins can access any restaurant.
    Managers are strictly scoped to their assigned restaurant_id.
    """
    role = getattr(admin, "role", "superadmin")
    if role == "superadmin":
        return
    admin_rest_id = getattr(admin, "restaurant_id", None)
    if admin_rest_id is not None and admin_rest_id != restaurant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ запрещён: вы можете управлять только своим заведением"
        )


async def get_current_admin(
    request: Request,
    auth_creds: Optional[HTTPAuthorizationCredentials] = Security(security_bearer)
) -> AdminSession:
    # Tokens accepted strictly via Authorization: Bearer or X-Admin-Token header
    token = None
    if auth_creds:
        token = auth_creds.credentials
    elif request.headers.get("x-admin-token"):
        token = request.headers.get("x-admin-token")
    
    if not token or not is_valid_token(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Требуется авторизация администратора (Bearer Token отсутствует или недействителен)",
            headers={"WWW-Authenticate": "Bearer"}
        )

    session = get_admin_session(token)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Сессия администратора не найдена или истекла"
        )
    return session
