#!/usr/bin/env bash
# Instant PUBLIC https URL from this machine (macOS/Linux). Live while this script runs.
set -euo pipefail
cd "$(dirname "$0")"
command -v cloudflared >/dev/null || { echo "Install cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"; exit 1; }

[ -f frontend/dist/index.html ] || (cd frontend && npm ci && npm run build)
[ -d backend/.venv ] || (python3 -m venv backend/.venv && backend/.venv/bin/pip install -r backend/requirements.txt)

export COOKIE_SECURE=true DATA_DIR="$PWD/data"
mkdir -p "$DATA_DIR"

(cd backend && ../backend/.venv/bin/python start_server.py) &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null' EXIT
sleep 5
echo "Public URL (https://xxxx.trycloudflare.com) appears below:"
cloudflared tunnel --url http://localhost:8080
