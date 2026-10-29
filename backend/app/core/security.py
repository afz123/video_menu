import json
import os
import secrets
import hashlib
import hmac
import asyncio
import logging
import fcntl
from pathlib import Path
from typing import Optional, Dict, Any
from fastapi import HTTPException, Security, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings

logger = logging.getLogger("video_menu.security")

TOKENS_FILE = settings.STORAGE_DIR / "admin_tokens.json"
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
    to work seamlessly, while exposing multi-tenant context attributes.
    """
    role: str = "superadmin"
    restaurant_id: Optional[int] = None
    restaurant_slug: Optional[str] = None

    def __new__(
        cls,
        token: str,
        role: str = "superadmin",
        restaurant_id: Optional[int] = None,
        restaurant_slug: Optional[str] = None
    ):
        instance = super().__new__(cls, token)
        instance.role = role
        instance.restaurant_id = restaurant_id
        instance.restaurant_slug = restaurant_slug
        return instance


TOKEN_LOCK_FILE = settings.STORAGE_DIR / "admin_tokens.lock"


class _SessionFileLock:
    def __init__(self, exclusive: bool = False):
        self.exclusive = exclusive
        self.fd = None

    def __enter__(self):
        settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
        self.fd = open(TOKEN_LOCK_FILE, "a+")
        mode = fcntl.LOCK_EX if self.exclusive else fcntl.LOCK_SH
        fcntl.flock(self.fd, mode)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.fd:
            try:
                fcntl.flock(self.fd, fcntl.LOCK_UN)
                self.fd.close()
            except Exception:
                pass


def _load_persisted_tokens() -> Dict[str, Dict[str, Any]]:
    tokens: Dict[str, Dict[str, Any]] = {}
    if _is_dev_environment():
        tokens[MASTER_DEMO_TOKEN] = {
            "role": "superadmin",
            "restaurant_id": None,
            "restaurant_slug": None
        }

    if TOKENS_FILE.exists():
        try:
            with open(TOKENS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    tokens.update(data)
                elif isinstance(data, list):
                    for tok in data:
                        tokens[tok] = {
                            "role": "superadmin",
                            "restaurant_id": None,
                            "restaurant_slug": None
                        }
        except Exception as e:
            logger.warning(f"Failed to read tokens file: {e}")
    return tokens


def _save_persisted_tokens(tokens: Dict[str, Dict[str, Any]]):
    try:
        settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
        # Atomic file write to avoid worker race condition
        temp_file = settings.STORAGE_DIR / f"admin_tokens_{secrets.token_hex(6)}.tmp"
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(tokens, f, indent=2)
        os.replace(temp_file, TOKENS_FILE)
    except Exception as e:
        logger.error(f"Failed to persist admin tokens: {e}")


VALID_SESSIONS: Dict[str, Dict[str, Any]] = _load_persisted_tokens()


def create_admin_token(
    role: str = "superadmin",
    restaurant_id: Optional[int] = None,
    restaurant_slug: Optional[str] = None
) -> str:
    token = secrets.token_hex(24)
    with _SessionFileLock(exclusive=True):
        fresh = _load_persisted_tokens()
        fresh[token] = {
            "role": role,
            "restaurant_id": restaurant_id,
            "restaurant_slug": restaurant_slug
        }
        VALID_SESSIONS.update(fresh)
        _save_persisted_tokens(VALID_SESSIONS)
    return token


def revoke_admin_token(token: str):
    with _SessionFileLock(exclusive=True):
        fresh = _load_persisted_tokens()
        if token in fresh:
            del fresh[token]
        if token in VALID_SESSIONS:
            del VALID_SESSIONS[token]
        _save_persisted_tokens(VALID_SESSIONS)


def is_valid_token(token: str) -> bool:
    if not token:
        return False
    if not _is_dev_environment() and token == MASTER_DEMO_TOKEN:
        return False
    if token in VALID_SESSIONS:
        return True
    with _SessionFileLock(exclusive=False):
        fresh = _load_persisted_tokens()
        VALID_SESSIONS.update(fresh)
    return token in VALID_SESSIONS


def get_admin_session(token: str) -> Optional[AdminSession]:
    if not is_valid_token(token):
        return None
    info = VALID_SESSIONS.get(token)
    if not info:
        return None
    return AdminSession(
        token=token,
        role=info.get("role", "superadmin"),
        restaurant_id=info.get("restaurant_id"),
        restaurant_slug=info.get("restaurant_slug")
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
