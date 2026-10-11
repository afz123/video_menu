# Core security helpers and token generation
import secrets

def generate_api_key() -> str:
    return secrets.token_urlsafe(32)

def verify_token(token: str, expected: str) -> bool:
    return secrets.compare_digest(token, expected)
