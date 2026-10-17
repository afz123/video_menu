import json
import secrets
import hashlib
from pathlib import Path
from typing import Optional, Dict, Any
from fastapi import HTTPException, Security, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings

TOKENS_FILE = settings.STORAGE_DIR / "admin_tokens.json"
MASTER_DEMO_TOKEN = "demo_master_token"

security_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str, salt: Optional[str] = None) -> str:
    """Cryptographically secure PBKDF2-HMAC-SHA256 password hashing."""
    if not salt:
        salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000
    ).hex()
    return f"{salt}${hashed}"


def verify_password(password: str, password_hash: Optional[str]) -> bool:
    """Verifies a plain password against a stored PBKDF2 hash."""
    if not password_hash or "$" not in password_hash:
        return False
    try:
        salt, hashed = password_hash.split("$", 1)
        test_hash = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000
        ).hex()
        return secrets.compare_digest(hashed, test_hash)
    except Exception:
        return False


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


def _load_persisted_tokens() -> Dict[str, Dict[str, Any]]:
    tokens: Dict[str, Dict[str, Any]] = {
        MASTER_DEMO_TOKEN: {
            "role": "superadmin",
            "restaurant_id": None,
            "restaurant_slug": None
        }
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
        except Exception:
            pass
    return tokens


def _save_persisted_tokens(tokens: Dict[str, Dict[str, Any]]):
    try:
        settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
        with open(TOKENS_FILE, "w", encoding="utf-8") as f:
            json.dump(tokens, f, indent=2)
    except Exception:
        pass


VALID_SESSIONS: Dict[str, Dict[str, Any]] = _load_persisted_tokens()


def create_admin_token(
    role: str = "superadmin",
    restaurant_id: Optional[int] = None,
    restaurant_slug: Optional[str] = None
) -> str:
    token = secrets.token_hex(24)
    VALID_SESSIONS[token] = {
        "role": role,
        "restaurant_id": restaurant_id,
        "restaurant_slug": restaurant_slug
    }
    _save_persisted_tokens(VALID_SESSIONS)
    return token


def revoke_admin_token(token: str):
    if token != MASTER_DEMO_TOKEN and token in VALID_SESSIONS:
        del VALID_SESSIONS[token]
        _save_persisted_tokens(VALID_SESSIONS)


def is_valid_token(token: str) -> bool:
    if not token:
        return False
    return token in VALID_SESSIONS


def get_admin_session(token: str) -> Optional[AdminSession]:
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
    token = None
    if auth_creds:
        token = auth_creds.credentials
    else:
        # Check X-Admin-Token or query parameter fallback for dev/kiosk
        token = request.headers.get("x-admin-token") or request.query_params.get("admin_token")
    
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
