#!/usr/bin/env bash
# One-command deploy on any Linux server/VPS (Azure VM, AWS, DigitalOcean, etc.)
# Usage:  ./deploy.sh            (needs Docker + Docker Compose)
# Afterwards open TCP port 8080 (or 80/443 via a reverse proxy) in the server firewall.
set -euo pipefail
cd "$(dirname "$0")"

command -v docker >/dev/null 2>&1 || { echo "ERROR: Docker is required: https://docs.docker.com/engine/install/"; exit 1; }

if [ ! -f .env ]; then
  echo "Creating .env with a generated SECRET_KEY ..."
  printf "SECRET_KEY=%s\nAI_PROVIDER=anthropic\nAI_API_KEY=\nCOOKIE_SECURE=false\n" \
    "$(head -c 48 /dev/urandom | base64 | tr -d '\n/+=')" > .env
  echo "Edit .env and add AI_API_KEY to enable the AI chat."
fi

docker compose up -d --build

echo "Waiting for health check ..."
for i in $(seq 1 30); do
  if curl -fs http://127.0.0.1:8080/api/health >/dev/null; then
    PUBLIC_IP=$(curl -fs https://api.ipify.org || echo "<your-server-ip>")
    echo ""
    echo "LIVE:  http://${PUBLIC_IP}:8080   (local check OK)"
    echo "Open port 8080 in your cloud firewall / security group. For HTTPS see DEPLOY_PUBLIC.md."
    exit 0
  fi
  sleep 2
done
echo "Health check failed. Logs:  docker compose logs web"; exit 1
