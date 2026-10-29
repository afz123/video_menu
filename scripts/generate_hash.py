#!/usr/bin/env python3
import sys
import secrets
import hashlib

def generate_hash(password: str, salt: str = None) -> str:
    if not salt:
        salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000
    ).hex()
    return f"{salt}${hashed}"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Использование: python3 scripts/generate_hash.py <твой_пароль>")
        sys.exit(1)
    pwd = sys.argv[1]
    h = generate_hash(pwd)
    print(f"\n🔑 Пароль: {pwd}")
    print(f"🛡️ PBKDF2 Хэш для DEFAULT_SUPERADMIN_HASH:\n{h}\n")

