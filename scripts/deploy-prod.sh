#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .env ]]; then
  echo "Missing .env. Copy .env.example to .env and edit production values first."
  exit 1
fi

set -a
. ./.env
set +a

if [[ -z "${CLOUDFLARE_TUNNEL_TOKEN:-}" ]]; then
  echo "CLOUDFLARE_TUNNEL_TOKEN is required for the production tunnel deployment."
  exit 1
fi

WEB_PORT="${WEB_PORT:-3000}"

echo "[wrepo] building and starting production services..."
docker compose --profile tunnel up -d --build --remove-orphans

echo "[wrepo] waiting for health endpoint on 127.0.0.1:${WEB_PORT}..."
for attempt in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${WEB_PORT}/api/health" >/dev/null; then
    echo "[wrepo] application is healthy"
    docker compose --profile tunnel ps
    exit 0
  fi

  sleep 2
done

echo "[wrepo] health check failed after 60 seconds"
docker compose --profile tunnel ps || true
docker compose logs web --tail 120 || true
docker compose logs cloudflared --tail 120 || true
exit 1
