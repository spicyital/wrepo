#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .env ]]; then
  echo "Missing .env. Copy .env.example to .env and edit production values first."
  exit 1
fi

set -a
. ./.env
set +a

is_placeholder_secret() {
  case "${1:-}" in
    ""|dev-only-change-me-before-production|dev-only-change-me-for-local-docker)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

if [[ -z "${CLOUDFLARE_TUNNEL_TOKEN:-}" ]]; then
  echo "CLOUDFLARE_TUNNEL_TOKEN is required for the production tunnel deployment."
  exit 1
fi

if is_placeholder_secret "${NEXTAUTH_SECRET:-}"; then
  echo "NEXTAUTH_SECRET must be set to a non-placeholder value before production deploy."
  exit 1
fi

if [[ "${ADMIN_BOOTSTRAP:-0}" == "1" ]] && { [[ -z "${ADMIN_EMAIL:-}" ]] || [[ -z "${ADMIN_PASSWORD:-}" ]]; }; then
  echo "ADMIN_BOOTSTRAP=1 requires ADMIN_EMAIL and ADMIN_PASSWORD."
  exit 1
fi

WEB_PORT="${WEB_PORT:-3000}"

echo "[wrepo] building and starting production services..."
docker compose --profile tunnel up -d --build --remove-orphans

echo "[wrepo] waiting for health endpoint on 127.0.0.1:${WEB_PORT}..."
for attempt in $(seq 1 30); do
  if curl -fsS -H "X-WRepo-Health-Token: ${HEALTHCHECK_TOKEN}" "http://127.0.0.1:${WEB_PORT}/api/health" >/dev/null; then
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
