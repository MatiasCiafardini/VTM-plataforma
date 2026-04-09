#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-}"

if [[ -z "$POSTGRES_PASSWORD" && -f "$ROOT_DIR/.env.prod" ]]; then
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env.prod"
fi

if [[ -z "${POSTGRES_PASSWORD:-}" ]]; then
  echo "POSTGRES_PASSWORD is required."
  exit 1
fi

mkdir -p "$BACKUP_DIR"

docker compose --env-file "$ROOT_DIR/.env.prod" -f "$ROOT_DIR/docker-compose.prod.yml" exec -T \
  -e PGPASSWORD="$POSTGRES_PASSWORD" \
  db pg_dump -U postgres -d tattoo_platform | gzip > "$BACKUP_DIR/tattoo_platform-$TIMESTAMP.sql.gz"

find "$BACKUP_DIR" -type f -name 'tattoo_platform-*.sql.gz' -mtime +14 -delete

echo "Backup created at $BACKUP_DIR/tattoo_platform-$TIMESTAMP.sql.gz"
