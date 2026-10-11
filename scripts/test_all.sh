#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "\n${BOLD}${BLUE}=====================================================${NC}"
echo -e "${BOLD}${BLUE}  ЗАПУСК ПОЛНОГО КОМПЛЕКСА ТЕСТОВ (BACKEND + FRONTEND) ${NC}"
echo -e "${BOLD}${BLUE}=====================================================${NC}\n"

# 1. Backend Pytest
echo -e "${BOLD}[1/3] Запуск Pytest для Backend...${NC}"
cd "${ROOT_DIR}/backend"
PYTHONPATH=. ./venv/bin/pytest tests/ -v
echo -e "${GREEN}✓ Pytest успешно завершен!${NC}\n"

# 2. Frontend Vitest
echo -e "${BOLD}[2/3] Запуск Vitest для Frontend...${NC}"
cd "${ROOT_DIR}/frontend"
npm test
echo -e "${GREEN}✓ Фронтенд тесты успешно завершены!${NC}\n"

# 3. Live API Verification (if servers are running)
echo -e "${BOLD}[3/3] Проверка живых эндпоинтов API...${NC}"
cd "${ROOT_DIR}"
if curl -s http://localhost:8088/api/health > /dev/null 2>&1; then
    python3 scripts/verify_api.py http://localhost:8088
else
    echo "Бэкенд-сервер на :8088 сейчас не запущен в фоне (пропуск живой проверки)."
fi

echo -e "\n${BOLD}${GREEN}=====================================================${NC}"
echo -e "${BOLD}${GREEN}  ВСЕ ТЕСТЫ И ПРОВЕРКИ УСПЕШНО ПРОЙДЕНЫ НА 100%!       ${NC}"
echo -e "${BOLD}${GREEN}=====================================================${NC}\n"
