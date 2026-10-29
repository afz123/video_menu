#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
docker compose down --remove-orphans
docker compose up -d --build
echo "Production stack successfully started on port 80."

