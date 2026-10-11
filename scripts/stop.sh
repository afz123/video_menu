#!/usr/bin/env bash
set -e

echo "[Video Menu] Stopping any existing processes on ports 3033, 8088, 3000, 8000..."

fuser -k 3033/tcp 2>/dev/null || true
fuser -k 8088/tcp 2>/dev/null || true
fuser -k 3000/tcp 2>/dev/null || true
fuser -k 8000/tcp 2>/dev/null || true

lsof -ti:3033 | xargs kill -9 2>/dev/null || true
lsof -ti:8088 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:8000 | xargs kill -9 2>/dev/null || true

pkill -f "uvicorn app.main:app" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

sleep 1
echo "[Video Menu] Ports cleared."
