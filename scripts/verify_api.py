#!/usr/bin/env python3
"""
Video Menu Luxury Platform - API & Service Verification Suite
Runs end-to-end checks against the running backend and proxy.
"""

import sys
import time
import json
import urllib.request
import urllib.error

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"


def print_header(title):
    print(f"\n{BOLD}{CYAN}{'='*60}{RESET}")
    print(f"{BOLD}{CYAN}  {title}{RESET}")
    print(f"{BOLD}{CYAN}{'='*60}{RESET}")


def request(url, method="GET", data=None, headers=None, timeout=10):
    if headers is None:
        headers = {}
    
    encoded_data = None
    if data is not None:
        if isinstance(data, dict) or isinstance(data, list):
            encoded_data = json.dumps(data).encode("utf-8")
            headers["Content-Type"] = "application/json"
        elif isinstance(data, str):
            encoded_data = data.encode("utf-8")

    req = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)
    start_t = time.time()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            elapsed = (time.time() - start_t) * 1000
            content = response.read().decode("utf-8")
            parsed = json.loads(content) if content else {}
            return True, response.status, parsed, elapsed
    except urllib.error.HTTPError as e:
        elapsed = (time.time() - start_t) * 1000
        error_content = e.read().decode("utf-8")
        try:
            parsed = json.loads(error_content)
        except Exception:
            parsed = {"raw": error_content}
        return False, e.code, parsed, elapsed
    except Exception as e:
        elapsed = (time.time() - start_t) * 1000
        return False, 0, {"error": str(e)}, elapsed


def run_checks(base_url):
    print_header(f"Проверка API Сервиса: {base_url}")
    results = []

    def check(name, method, endpoint, payload=None, validator=None):
        full_url = f"{base_url}{endpoint}"
        success, status, data, elapsed = request(full_url, method=method, data=payload)
        passed = success and (200 <= status < 300)
        
        detail = ""
        if passed and validator:
            try:
                v_ok, v_detail = validator(data)
                if not v_ok:
                    passed = False
                    detail = f"Валидация: {v_detail}"
            except Exception as ex:
                passed = False
                detail = f"Ошибка валидации: {ex}"

        if passed:
            print(f" {GREEN}[✓ PASS]{RESET} {name:<35} ({status}) in {elapsed:5.1f}ms")
            results.append((name, True, elapsed))
        else:
            print(f" {RED}[✗ FAIL]{RESET} {name:<35} ({status}) in {elapsed:5.1f}ms - {detail or data}")
            results.append((name, False, elapsed))

    # 1. Health check
    check(
        "Health Check (/api/health)",
        "GET",
        "/api/health",
        validator=lambda d: (d.get("status") == "online", "status is not online")
    )

    # 2. Restaurants
    check(
        "List Restaurants (/api/v1/restaurants)",
        "GET",
        "/api/v1/restaurants",
        validator=lambda d: (isinstance(d, list) and len(d) > 0, "no restaurants found")
    )

    # 3. Default restaurant
    check(
        "Default Restaurant Details",
        "GET",
        "/api/v1/restaurants/asr-royale",
        validator=lambda d: (d.get("slug") == "asr-royale", "slug mismatch")
    )

    # 4. Full Menu
    check(
        "Full Menu Tree (/full-menu)",
        "GET",
        "/api/v1/restaurants/asr-royale/full-menu",
        validator=lambda d: ("categories" in d and len(d["categories"]) > 0, "categories empty")
    )

    # 5. Categories
    check(
        "Categories List",
        "GET",
        "/api/v1/categories?restaurant_id=1",
        validator=lambda d: (isinstance(d, list) and len(d) > 0, "categories list empty")
    )

    # 6. Dishes
    check(
        "Dishes List",
        "GET",
        "/api/v1/dishes?restaurant_id=1",
        validator=lambda d: (isinstance(d, list) and len(d) > 0, "dishes list empty")
    )

    # 7. Translation endpoint
    check(
        "Auto-Translate Service (ru -> tj, en)",
        "POST",
        "/api/v1/translate",
        payload={
            "source_lang": "ru",
            "target_langs": ["tj", "en"],
            "fields": {
                "name": "Шашлык из баранины",
                "description": "Свежее мясо на углях"
            }
        },
        validator=lambda d: (
            "translations" in d and
            "tj" in d["translations"] and
            "en" in d["translations"] and
            len(d["translations"]["en"].get("name", "")) > 0,
            "translation missing fields"
        )
    )

    # 8. Auth Login
    check(
        "Admin Login Verification",
        "POST",
        "/api/v1/auth/login",
        payload={"password": "admin123", "slug": "asr-royale"},
        validator=lambda d: (d.get("status") == "success" and "token" in d, "token missing")
    )

    print(f"\n{BOLD}{'='*60}{RESET}")
    total = len(results)
    passed_count = sum(1 for _, ok, _ in results if ok)
    if passed_count == total:
        print(f" {GREEN}{BOLD}ИТОГ: Все {total} API проверок успешно пройдены! [100%]{RESET}")
    else:
        print(f" {RED}{BOLD}ИТОГ: Пройдено {passed_count}/{total} проверок.{RESET}")
    print(f"{BOLD}{'='*60}{RESET}\n")

    return passed_count == total


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8088"
    all_ok = run_checks(target)
    sys.exit(0 if all_ok else 1)
