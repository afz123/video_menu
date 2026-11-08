#!/usr/bin/env python3
# =============================================================================
# Video Menu Luxury Platform — Автоматический деплой на удаленный сервер
#
# Использование:
#   python3 deploy_to_server.py [--build] [--skip-build] [--force-postgres]
# =============================================================================

import os
import sys
import time
import argparse
import subprocess
import getpass

try:
    import paramiko
    import paramiko.common
    # Увеличиваем размер буфера SFTP для максимальной скорости передачи образов
    paramiko.common.DEFAULT_WINDOW_SIZE = 3 * 1024 * 1024
    paramiko.common.DEFAULT_MAX_PACKET_SIZE = 32768
except ImportError:
    print("❌ Модуль paramiko не установлен. Установите: pip install paramiko")
    sys.exit(1)

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
DEPLOY_DIR = os.path.join(PROJECT_ROOT, "deploy")
IMAGES_TAR = os.path.join(DEPLOY_DIR, "images.tar.gz")
ENV_DEPLOY_FILE = os.path.join(PROJECT_ROOT, ".env.deploy")

# ==========================================
# 1. ЧТЕНИЕ КОНФИГУРАЦИИ
# ==========================================
def load_config():
    config = {
        "host": None,
        "port": 22,
        "user": "root",
        "password": None,
        "remote_dir": "/opt/video_menu",
        "frontend_port": 3033,
        "backend_port": 8088
    }

    if os.path.exists(ENV_DEPLOY_FILE):
        print(f"📄 Чтение реквизитов из {ENV_DEPLOY_FILE}...")
        with open(ENV_DEPLOY_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                k = k.strip().lower()
                v = v.strip().strip("'\"")
                if k in ("host", "server", "ip"): config["host"] = v
                elif k in ("port", "ssh_port"): config["port"] = int(v)
                elif k in ("user", "username"): config["user"] = v
                elif k in ("password", "pass"): config["password"] = v
                elif k in ("remote_dir", "dest_dir"): config["remote_dir"] = v
                elif k in ("frontend_port",): config["frontend_port"] = int(v)
                elif k in ("backend_port",): config["backend_port"] = int(v)

    if not config["host"]:
        config["host"] = input("🌐 Введите IP или домен сервера: ").strip()
    if not config["user"]:
        config["user"] = input("👤 Пользователь SSH [root]: ").strip() or "root"
    if not config["password"]:
        config["password"] = getpass.getpass(f"🔑 Пароль SSH для {config['user']}@{config['host']}: ")

    return config

# ==========================================
# 2. СБОРКА И ЭКСПОРТ DOCKER-ОБРАЗОВ
# ==========================================
def build_and_pack_images(include_postgres=True, skip_build=False, use_cython=False):
    os.makedirs(DEPLOY_DIR, exist_ok=True)

    if skip_build and os.path.exists(IMAGES_TAR):
        size_mb = os.path.getsize(IMAGES_TAR) / (1024 * 1024)
        print(f"📦 Пропуск локальной сборки: найден существующий {IMAGES_TAR} ({size_mb:.1f} MB)")
        return

    dockerfile = "Dockerfile.cython" if use_cython else "Dockerfile"
    mode_text = "🔒 С CYTHON (защита кода, долгая компиляция)" if use_cython else "⚡ БЫСТРЫЙ РЕЖИМ (чистый Python, моментальная сборка)"
    print(f"\n🔨 Шаг 2: Локальная сборка контейнеров Docker [{mode_text}]...")
    env = os.environ.copy()
    env["DOCKER_BUILDKIT"] = "1"
    env["COMPOSE_DOCKER_CLI_BUILD"] = "1"

    # Сборка бэкенда с выбранным Dockerfile
    backend_build_cmd = ["docker", "build", "-t", "video_menu-backend:latest", "-f", f"backend/{dockerfile}", "backend"]
    print(f"  -> Сборка Backend: {' '.join(backend_build_cmd)}")
    res_b = subprocess.run(backend_build_cmd, cwd=PROJECT_ROOT, env=env)
    if res_b.returncode != 0:
        print("❌ Ошибка сборки backend!")
        sys.exit(1)

    # Сборка фронтенда
    frontend_build_cmd = ["docker", "build", "-t", "video_menu-frontend:latest", "frontend"]
    print(f"  -> Сборка Frontend: {' '.join(frontend_build_cmd)}")
    res_f = subprocess.run(frontend_build_cmd, cwd=PROJECT_ROOT, env=env)
    if res_f.returncode != 0:
        print("❌ Ошибка сборки frontend!")
        sys.exit(1)

    images_to_save = [
        "video_menu-frontend:latest",
        "video_menu-backend:latest",
    ]

    if include_postgres:
        print("🐘 Включение postgres:16-alpine в архив отправки...")
        subprocess.run(["docker", "pull", "postgres:16-alpine"], cwd=PROJECT_ROOT, check=False)
        images_to_save.append("postgres:16-alpine")
    else:
        print("⚡ Пропуск PostgreSQL: образ уже готов на сервере. Упаковываем ТОЛЬКО frontend и backend!")

    print(f"\n📦 Шаг 3: Сохранение и ультра-сжатие образов в {IMAGES_TAR} (gzip)...")
    inspect_proc = subprocess.run(["docker", "images", "--format", "{{.Repository}}:{{.Tag}}"], capture_output=True, text=True)
    available_images = inspect_proc.stdout.splitlines()

    target_images = []
    for img in images_to_save:
        target_name = None
        base_name = img.split(":")[0]
        for a in available_images:
            if a == img or a.startswith(base_name + ":"):
                target_name = a
                break
        if target_name:
            target_images.append(target_name)
        else:
            target_images.append(img)

    save_cmd = ["docker", "save"] + target_images
    print(f"  -> Выполняю экспорт со сжатием gzip: {' '.join(save_cmd)} | gzip -1 > {IMAGES_TAR}")
    
    with open(IMAGES_TAR, "wb") as f_out:
        p_save = subprocess.Popen(save_cmd, stdout=subprocess.PIPE)
        p_gzip = subprocess.Popen(["gzip", "-1"], stdin=p_save.stdout, stdout=f_out)
        p_save.stdout.close()
        p_gzip.communicate()
        if p_save.wait() != 0 or p_gzip.returncode != 0:
            print("❌ Ошибка сохранения и сжатия образов в images.tar.gz!")
            sys.exit(1)

    size_mb = os.path.getsize(IMAGES_TAR) / (1024 * 1024)
    print(f"✅ Образы успешно упакованы и сжаты: {IMAGES_TAR} ({size_mb:.1f} MB)")

# ==========================================
# 3. SSH ХЕЛПЕРЫ
# ==========================================
def run_ssh(client, cmd, show=True, timeout=600):
    if show:
        print(f"\n$ {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, get_pty=True, timeout=timeout)
    out = stdout.read().decode(errors="replace")
    if out and show:
        print(out.rstrip())
    return out

def print_progress(transferred, total):
    if total <= 0:
        return
    percent = (transferred / total) * 100
    mb_transferred = transferred / (1024 * 1024)
    mb_total = total / (1024 * 1024)
    print(f"\r    Прогресс: {mb_transferred:.1f}/{mb_total:.1f} MB ({percent:.1f}%)", end="", flush=True)

# ==========================================
# 4. ОСНОВНОЙ ПРОЦЕСС ДЕПЛОЯ
# ==========================================
def main():
    parser = argparse.ArgumentParser(description="Автодеплой Video Menu на удаленный сервер")
    parser.add_argument("--build", action="store_true", help="Принудительно пересобрать Docker образы")
    parser.add_argument("--skip-build", action="store_true", help="Пропустить сборку, если images.tar.gz уже есть")
    parser.add_argument("--cython", action="store_true", help="Использовать Cython сборку в .so бинарники (защита кода)")
    parser.add_argument("--force-postgres", action="store_true", help="Принудительно отправить postgres:16-alpine")
    args = parser.parse_args()

    config = load_config()
    host = config["host"]
    user = config["user"]
    remote_dir = config["remote_dir"]
    frontend_port = config["frontend_port"]
    backend_port = config["backend_port"]

    # 1. Подключение по SSH
    print(f"\n🚀 Шаг 1: Подключение к {user}@{host}:{config['port']}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(
            hostname=host,
            port=config["port"],
            username=user,
            password=config["password"],
            look_for_keys=False,
            allow_agent=False,
            timeout=30
        )
    except Exception as e:
        print(f"❌ Ошибка подключения по SSH: {e}")
        sys.exit(1)

    print("✅ Успешно подключено к серверу!")

    # 2. Проверка состояния PostgreSQL на сервере
    print("\n🔍 Проверка наличия и состояния PostgreSQL на сервере...")
    include_postgres = True
    if args.force_postgres:
        print("  ⚠️ Указан --force-postgres: образ PostgreSQL будет отправлен принудительно.")
        include_postgres = True
    else:
        has_pg_image = run_ssh(client, "docker image inspect postgres:16-alpine >/dev/null 2>&1 && echo 'YES' || echo 'NO'", show=False).strip()
        if has_pg_image == "YES":
            print("  ✅ PostgreSQL (postgres:16-alpine) УЖЕ присутствует в Docker на сервере!")
            print("  🚀 Отправка Postgres исключена (экономия сотен мегабайт сетевого трафика)!")
            include_postgres = False
        else:
            print("  ⏳ Образ postgres:16-alpine не найден на сервере. Проверяю прямую загрузку на сервере...")
            pull_check = run_ssh(client, "docker pull postgres:16-alpine >/dev/null 2>&1 && echo 'PULLED' || echo 'FAILED'", show=False).strip()
            if pull_check == "PULLED":
                print("  ✅ Сервер успешно загрузил postgres:16-alpine напрямую из Docker Hub! Отправлять не требуется.")
                include_postgres = False
            else:
                print("  ⚠️ Прямая загрузка недоступна. Образ postgres:16-alpine будет упакован локально и передан.")
                include_postgres = True

    # 3. Сборка и упаковка образов
    skip_b = args.skip_build and not args.build
    build_and_pack_images(include_postgres=include_postgres, skip_build=skip_b, use_cython=args.cython)

    # 4. Подготовка папки на сервере и передача файлов
    run_ssh(client, f"mkdir -p {remote_dir}")
    sftp = client.open_sftp()

    print(f"\n📤 Шаг 4: Загрузка файлов на сервер ({remote_dir})...")
    files_to_upload = [
        (os.path.join(DEPLOY_DIR, "docker-compose.yml"), f"{remote_dir}/docker-compose.yml"),
        (os.path.join(DEPLOY_DIR, "setup.sh"), f"{remote_dir}/setup.sh"),
        (IMAGES_TAR, f"{remote_dir}/images.tar.gz")
    ]

    if os.path.exists(os.path.join(DEPLOY_DIR, ".env")):
        files_to_upload.append((os.path.join(DEPLOY_DIR, ".env"), f"{remote_dir}/.env"))

    for local_f, remote_f in files_to_upload:
        if not os.path.exists(local_f):
            continue
        fname = os.path.basename(local_f)
        size_mb = os.path.getsize(local_f) / (1024 * 1024)
        print(f"  -> Отправка {fname} ({size_mb:.1f} MB)...")
        sftp.put(local_f, remote_f, callback=print_progress)
        print()
        if remote_f.endswith(".sh"):
            sftp.chmod(remote_f, 0o755)

    sftp.close()

    # 5. Выполнение setup.sh
    print("\n⚙️ Шаг 5: Проверка окружения на сервере (setup.sh)...")
    run_ssh(client, f"cd {remote_dir} && sudo bash setup.sh")

    # 6. Загрузка образов
    print("\n📦 Шаг 6: Импорт и распаковка Docker-образов на сервере...")
    run_ssh(client, f"cd {remote_dir} && gzip -dc images.tar.gz | docker load", timeout=900)

    # 7. Запуск контейнеров
    print("\n🔄 Шаг 7: Запуск сервисов Video Menu...")
    run_ssh(client, f"cd {remote_dir} && docker compose up -d --remove-orphans")

    # 8. Ожидание готовности
    print("\n⏳ Шаг 8: Ожидание готовности базы данных и бэкенда (до 60 сек)...")
    time.sleep(5)
    backend_ready = False
    for _ in range(12):
        status = run_ssh(client, f"curl -s -o /dev/null -w '%{{http_code}}' http://localhost:{backend_port}/docs || echo '000'", show=False).strip()
        if status in ("200", "307"):
            print("✅ Бэкенд и база данных успешно запущены и отвечают!")
            backend_ready = True
            break
        time.sleep(4)
        print(f"  ... ожидание запуска бэкенда (HTTP {status})")

    if not backend_ready:
        print("\n❌ Бэкенд не запустился вовремя! Последние логи:")
        run_ssh(client, f"cd {remote_dir} && docker compose logs --tail=30 backend")

    # 9. Проверка статуса контейнеров
    print("\n📊 Статус контейнеров на сервере:")
    run_ssh(client, f"cd {remote_dir} && docker compose ps")

    # 10. Тестирование фронтенда
    print(f"\n🧪 Тестирование веб-интерфейса (порт {frontend_port})...")
    front_test = run_ssh(client, f"curl -s -o /dev/null -w '%{{http_code}}' http://localhost:{frontend_port}/ || echo '000'", show=False).strip()
    if front_test == "200":
        print(f"✅ Фронтенд успешно отдает страницы (HTTP {front_test})")
    else:
        print(f"⚠️ Фронтенд вернул код HTTP {front_test}, проверка логов:")
        run_ssh(client, f"cd {remote_dir} && docker compose logs --tail=20 frontend")

    # 11. Проверка службы автозапуска systemd при перезагрузке сервера
    print("\n⚡ Шаг 11: Проверка службы автозапуска при перезагрузке (video-menu.service)...")
    autostart_status = run_ssh(client, "systemctl is-enabled video-menu.service 2>/dev/null || echo 'disabled'", show=False).strip()
    if autostart_status == "enabled":
        print("✅ Автозапуск при перезагрузке сервера АКТИВЕН (systemd video-menu.service: enabled)")
    else:
        print("⚙️ Регистрация службы автозапуска systemd...")
        run_ssh(client, f"cd {remote_dir} && sudo bash setup.sh")

    client.close()

    print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("✨ ДЕПЛОЙ НА СЕРВЕР УСПЕШНО ЗАВЕРШЁН!")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"\n🌍 Главная (Клиентское видео-меню): http://{host}:{frontend_port}")
    print(f"🔒 Панель администратора:           http://{host}:{frontend_port}/admin")
    print(f"📺 Киоск / ТВ-витрина:              http://{host}:{frontend_port}/kiosk")
    print(f"📚 Swagger API бэкенда:             http://{host}:{backend_port}/docs")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

if __name__ == "__main__":
    main()

