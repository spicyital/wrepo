#!/usr/bin/env bash
set -euo pipefail

umask 077

if [[ -f .env ]]; then
  set -a
  . ./.env
  set +a
fi

BACKUP_ROOT="${BACKUP_ROOT:-./backups}"
STORAGE_HOST_PATH="${STORAGE_HOST_PATH:-./storage}"

resolve_path() {
  local input="$1"
  if [[ "$input" = /* ]]; then
    printf '%s\n' "$input"
  else
    printf '%s\n' "$(pwd)/$input"
  fi
}

backup_root="$(resolve_path "$BACKUP_ROOT")"
storage_root="$(resolve_path "$STORAGE_HOST_PATH")"
stamp="$(date +%Y%m%d-%H%M%S)"
target_dir="${backup_root}/${stamp}"

mkdir -p "$target_dir"

echo "[wrepo] writing database backup to ${target_dir}/db.sql.gz"
docker compose exec -T db sh -lc 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip -c > "${target_dir}/db.sql.gz"

if [[ -d "$storage_root" ]]; then
  echo "[wrepo] archiving uploads from ${storage_root}"
  tar -C "$(dirname "$storage_root")" -czf "${target_dir}/storage.tar.gz" "$(basename "$storage_root")"
else
  echo "[wrepo] storage directory not found, skipping uploads backup"
fi

if command -v git >/dev/null 2>&1; then
  git rev-parse HEAD > "${target_dir}/revision.txt" 2>/dev/null || true
fi

if command -v sha256sum >/dev/null 2>&1; then
  (
    cd "$target_dir"
    sha256sum ./* > SHA256SUMS
  )
fi

echo "[wrepo] backup complete: ${target_dir}"
