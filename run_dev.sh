#!/bin/bash

# ==============================================================================
# 🍽️ Video Menu Luxury Platform — Dev Launcher (Локально + БД в Docker)
# Порты: База данных = 5431, Бэкенд = 8088, Фронтенд = 3033
# ==============================================================================
set -e

echo "🛠️ Запуск премиальной платформы Video Menu..."

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
echo "📂 Рабочая директория: $DIR"
mkdir -p "$DIR/logs"

# 1. Остановка старых процессов на портах 3033, 8088, 5431 (и legacy 3000, 8000, 3010, 8010)
echo "⛔ Останавливаю старые процессы (порты 3033, 8088, 3000, 8000)..."
fuser -k 3033/tcp 2>/dev/null || lsof -ti:3033 | xargs kill -9 2>/dev/null || true
fuser -k 8088/tcp 2>/dev/null || lsof -ti:8088 | xargs kill -9 2>/dev/null || true
fuser -k 3000/tcp 2>/dev/null || lsof -ti:3000 | xargs kill -9 2>/dev/null || true
fuser -k 8000/tcp 2>/dev/null || lsof -ti:8000 | xargs kill -9 2>/dev/null || true
fuser -k 3010/tcp 2>/dev/null || lsof -ti:3010 | xargs kill -9 2>/dev/null || true
fuser -k 8010/tcp 2>/dev/null || lsof -ti:8010 | xargs kill -9 2>/dev/null || true
sleep 1

# 2. Определение реального IP адреса в локальной сети (Wi-Fi / Ethernet / WSL2)
SERVER_IP=""
PS_BIN="/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe"

if [ -x "$PS_BIN" ]; then
    SERVER_IP=$("$PS_BIN" -NoProfile -Command '
        $route = Get-NetRoute -DestinationPrefix "0.0.0.0/0" 2>$null | Sort-Object RouteMetric | Select-Object -First 1
        if ($route) {
            (Get-NetIPAddress -InterfaceIndex $route.InterfaceIndex -AddressFamily IPv4 2>$null | Where-Object { $_.IPAddress -notlike "169.254*" }).IPAddress | Select-Object -First 1
        } else {
            (Get-NetIPAddress -AddressFamily IPv4 2>$null | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.InterfaceAlias -notlike "*vEthernet*" -and $_.IPAddress -notlike "169.254*" }).IPAddress | Select-Object -First 1
        }
    ' 2>/dev/null | tr -d '\r' | head -n 1)
fi

if [ -z "$SERVER_IP" ]; then
    if command -v ip >/dev/null 2>&1; then
        SERVER_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7}')
        if [ -z "$SERVER_IP" ]; then
            SERVER_IP=$(ip -4 addr show scope global 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | head -n 1)
        fi
    fi
fi

if [ -z "$SERVER_IP" ] && command -v hostname >/dev/null 2>&1; then
    SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
fi

SHOW_IP=${SERVER_IP:-"127.0.0.1"}
echo "🌐 Локальный IP адрес (Wi-Fi): $SHOW_IP"

# 3. Настройка portproxy в Windows (WSL2 -> Windows Host для портов 3033 и 8088)
if [ -x "$PS_BIN" ]; then
    WSL_IP=$(ip -4 addr show dev eth0 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | head -n 1)
    if [ -n "$WSL_IP" ]; then
        CURRENT_PROXY=$("$PS_BIN" -NoProfile -Command '
            (netsh interface portproxy show all 2>$null) | Select-String "3033" | ForEach-Object { ($_ -split "\s+")[2] }
        ' 2>/dev/null | tr -d '\r' | head -n 1)

        if [ "$CURRENT_PROXY" != "$WSL_IP" ]; then
            echo "⚠️ WSL IP обновился ($CURRENT_PROXY -> $WSL_IP). Обновляю portproxy Windows..."
            "$PS_BIN" -NoProfile -Command "Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile -Command netsh interface portproxy add v4tov4 listenport=3033 listenaddress=0.0.0.0 connectport=3033 connectaddress=$WSL_IP; netsh interface portproxy add v4tov4 listenport=8088 listenaddress=0.0.0.0 connectport=8088 connectaddress=$WSL_IP' " 2>/dev/null || true
        else
            echo "🔗 Проброс портов Windows -> WSL: ✅ $WSL_IP (актуален)"
        fi
    fi
fi

# 4. Проверка и запуск PostgreSQL в Docker
echo "🐳 Проверка контейнера PostgreSQL..."
cd "$DIR"

if docker ps -a --format '{{.Names}}' | grep -q "^video_menu_postgres$"; then
    if ! docker ps --format '{{.Names}}' | grep -q "^video_menu_postgres$"; then
        docker start video_menu_postgres >/dev/null 2>&1
    fi
else
    docker run -d \
        --name video_menu_postgres \
        -p 5435:5432 \
        -e POSTGRES_USER=videomenu \
        -e POSTGRES_PASSWORD=videomenu \
        -e POSTGRES_DB=videomenu \
        -v video_menu_pgdata:/var/lib/postgresql/data \
        postgres:16-alpine >/dev/null 2>&1 || true
fi

# Определяем реальный порт контейнера
DETECTED_PORT=$(docker port video_menu_postgres 5432 2>/dev/null | cut -d: -f2 | head -n 1)
export DB_PORT="${DETECTED_PORT:-5435}"
export DATABASE_URL="postgresql+asyncpg://videomenu:videomenu@127.0.0.1:${DB_PORT}/videomenu"
export FRONTEND_PORT="3033"
export BACKEND_PORT="8088"

echo "⏳ Ожидание готовности PostgreSQL на порту $DB_PORT..."
for i in {1..15}; do
    if docker exec -i video_menu_postgres pg_isready -U videomenu >/dev/null 2>&1; then
        echo "✅ База данных готова (PostgreSQL 16 на порту $DB_PORT)"
        break
    fi
    sleep 1
done

# 5. Инициализация venv и запуск FastAPI бэкенда на порту 8088
echo "🚀 Подготовка и запуск FastAPI бэкенда (порт 8088)..."
cd "$DIR/backend"

if [ ! -d "venv" ]; then
    echo "📦 Создаю виртуальное окружение venv в backend..."
    python3 -m venv venv
    source venv/bin/activate
    echo "📦 Устанавливаю зависимости из requirements.txt..."
    pip install -q --upgrade pip
    pip install -q -r requirements.txt
else
    source venv/bin/activate
fi

export PYTHONPATH="$DIR/backend:$PYTHONPATH"
setsid "$DIR/backend/venv/bin/uvicorn" app.main:app --reload --reload-dir app --host 0.0.0.0 --port 8088 > "$DIR/logs/backend.log" 2>&1 &
echo "✅ Бэкенд запущен на http://0.0.0.0:8088"

# 6. Инициализация npm и запуск React/Vite фронтенда на порту 3033
echo "🚀 Подготовка и запуск Vite фронтенда (порт 3033)..."
cd "$DIR/frontend"

if [ ! -d "node_modules" ]; then
    echo "📦 Устанавливаю зависимости npm..."
    npm install
fi

setsid "$DIR/frontend/node_modules/.bin/vite" --port 3033 --host 0.0.0.0 > "$DIR/logs/frontend.log" 2>&1 &
echo "✅ Фронтенд запущен на http://0.0.0.0:3033"

# 7. Проверка готовности сервисов
echo "⏳ Проверяю отклик сервисов..."
for i in {1..15}; do
    if curl -s "http://127.0.0.1:8088/api/health" | grep -q "online" && curl -s "http://127.0.0.1:3033" >/dev/null 2>&1; then
        break
    fi
    sleep 1
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ VIDEO MENU LUXURY PLATFORM УСПЕШНО ЗАПУЩЕНА!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💻 На этом ПК:                 http://localhost:3033/menu/asr-royale"
echo "📱 На смартфонах по Wi-Fi:      http://$SHOW_IP:3033/menu/asr-royale"
echo "🖥️ Уличный Kiosk-дисплей:       http://$SHOW_IP:3033/kiosk/asr-royale"
echo "⚙️ Панель управления (CMS):     http://$SHOW_IP:3033/admin"
echo "📚 Swagger API (Бэкенд):        http://$SHOW_IP:8088/docs"
echo "🗄️ База данных PostgreSQL:      localhost:${DB_PORT} (user/pass: videomenu)"
echo ""
echo "📷 QR-код для мгновенного открытия меню на телефоне:"
"$DIR/backend/venv/bin/python3" -c "import qrcode; qr = qrcode.QRCode(border=1); qr.add_data('http://$SHOW_IP:3033/menu/asr-royale'); qr.print_ascii(invert=True)" 2>/dev/null || true
echo ""
echo "📊 Логи в реальном времени:"
echo "   tail -f $DIR/logs/backend.log"
echo "   tail -f $DIR/logs/frontend.log"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"