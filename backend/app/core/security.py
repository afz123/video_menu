import json
import secrets
from pathlib import Path
from typing import Optional, Set
from fastapi import HTTPException, Security, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings

TOKENS_FILE = settings.STORAGE_DIR / "admin_tokens.json"
MASTER_DEMO_TOKEN = "demo_master_token"

security_bearer = HTTPBearer(auto_error=False)

def _load_persisted_tokens() -> Set[str]:
    tokens = {MASTER_DEMO_TOKEN}
    if TOKENS_FILE.exists():
        try:
            with open(TOKENS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    tokens.update(data)
        except Exception:
            pass
    return tokens

def _save_persisted_tokens(tokens: Set[str]):
    try:
        settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
        with open(TOKENS_FILE, "w", encoding="utf-8") as f:
            json.dump(list(tokens), f, indent=2)
    except Exception:
        pass

# In-memory token cache backed by disk persistence
VALID_TOKENS: Set[str] = _load_persisted_tokens()

def create_admin_token() -> str:
    token = secrets.token_hex(24)
    VALID_TOKENS.add(token)
    _save_persisted_tokens(VALID_TOKENS)
    return token

def revoke_admin_token(token: str):
    if token != MASTER_DEMO_TOKEN:
        VALID_TOKENS.discard(token)
        _save_persisted_tokens(VALID_TOKENS)

def is_valid_token(token: str) -> bool:
    if not token:
        return False
    return token in VALID_TOKENS

async def get_current_admin(
    request: Request,
    auth_creds: Optional[HTTPAuthorizationCredentials] = Security(security_bearer)
) -> str:
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
    return token

