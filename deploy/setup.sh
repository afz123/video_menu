#!/usr/bin/env bash
# =============================================================================
# Video Menu Luxury Platform — Remote Server Setup
# Настраивает UFW фаервол и службу автозапуска systemd без вмешательства в другие сервисы
# =============================================================================

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}  Video Menu Luxury Platform — Подготовка сервера    ${NC}"
echo -e "${BLUE}=====================================================${NC}"

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}❌ Запустите от имени root: sudo bash setup.sh${NC}"
  exit 1
fi

# ── 1. Проверка Docker и Docker Compose ────────────────
if command -v docker &>/dev/null; then
  echo -e "${GREEN}✅ Docker уже установлен: $(docker --version)${NC}"
else
  echo -e "${YELLOW}Docker не найден. Устанавливаю...${NC}"
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker &>/dev/null || true
  systemctl start docker &>/dev/null || true
fi

# ── 2. Открытие ТОЛЬКО портов Video Menu в UFW (3033, 8088) ───
# ВНИМАНИЕ: не сбрасываем существующие правила UFW, чтобы не сломать соседние сервисы!
echo -e "\n${YELLOW}🛡️  Настройка портов UFW для Video Menu...${NC}"
ufw allow 3033/tcp comment 'Video Menu Frontend' || true
ufw allow 8088/tcp comment 'Video Menu Backend' || true
echo -e "${GREEN}✅ Порты 3033 (Frontend) и 8088 (Backend) открыты в UFW.${NC}"
echo -e "${GREEN}✅ Другие сервисы (80, 443, 3010, 8010) не затронуты.${NC}"

# ── 3. Служба автозапуска systemd для Video Menu ───────
echo -e "\n${YELLOW}⚙️  Настройка службы автозапуска (video-menu.service)...${NC}"
TARGET_DIR="${PWD}"
cat << EOF > /etc/systemd/system/video-menu.service
[Unit]
Description=Video Menu Luxury Platform (Docker Compose)
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${TARGET_DIR}
ExecStart=/usr/bin/docker compose up -d --remove-orphans
ExecStop=/usr/bin/docker compose stop
ExecReload=/usr/bin/docker compose restart
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable video-menu.service &>/dev/null || true
echo -e "${GREEN}✅ Служба video-menu.service активна!${NC}"
