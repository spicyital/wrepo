#!/bin/sh
set -eu

umask 027

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

is_local_url() {
  case "${1:-}" in
    http://localhost|http://localhost:*|http://127.0.0.1|http://127.0.0.1:*|https://localhost|https://localhost:*|https://127.0.0.1|https://127.0.0.1:*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

is_local_only_runtime() {
  is_local_url "${APP_URL:-}" && is_local_url "${NEXTAUTH_URL:-}"
}

require_non_placeholder() {
  name="$1"
  value="$2"

  if [ -z "$value" ]; then
    echo "[wrepo] $name must be set"
    exit 1
  fi

  if is_placeholder_secret "$value" && ! is_local_only_runtime; then
    echo "[wrepo] $name must be replaced before non-local production use"
    exit 1
  fi
}

if [ "${NODE_ENV:-development}" = "production" ]; then
  require_non_placeholder "NEXTAUTH_SECRET" "${NEXTAUTH_SECRET:-}"
fi

storage_dir="${STORAGE_LOCAL_PATH:-/app/storage}"
mkdir -p "$storage_dir"

if [ ! -w "$storage_dir" ]; then
  echo "[wrepo] storage directory is not writable: $storage_dir"
  exit 1
fi

echo "[wrepo] applying prisma migrations..."
attempt=1
max_attempts=8

until ./node_modules/.bin/prisma migrate deploy; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "[wrepo] prisma migrate deploy failed after ${attempt} attempts"
    exit 1
  fi

  echo "[wrepo] prisma migrate deploy failed (attempt ${attempt}/${max_attempts}); retrying in 3s..."
  attempt=$((attempt + 1))
  sleep 3
done

# Optional: auto-run admin upsert if ADMIN_BOOTSTRAP=1
if [ "${ADMIN_BOOTSTRAP:-0}" = "1" ]; then
  if [ -z "${ADMIN_EMAIL:-}" ] || [ -z "${ADMIN_PASSWORD:-}" ]; then
    echo "[wrepo] ADMIN_BOOTSTRAP=1 requires ADMIN_EMAIL and ADMIN_PASSWORD"
    exit 1
  fi

  echo "[wrepo] ensuring admin user..."
  ./node_modules/.bin/tsx scripts/create-admin.ts
fi

echo "[wrepo] starting next.js..."
exec node server.js
