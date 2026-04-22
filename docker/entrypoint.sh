#!/bin/sh
set -eu

umask 027

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
if [ "${ADMIN_BOOTSTRAP:-0}" = "1" ] && [ -n "${ADMIN_EMAIL:-}" ] && [ -n "${ADMIN_PASSWORD:-}" ]; then
  echo "[wrepo] ensuring admin user..."
  ./node_modules/.bin/tsx scripts/create-admin.ts || echo "[wrepo] admin bootstrap failed (non-fatal)"
fi

echo "[wrepo] starting next.js..."
exec node server.js
