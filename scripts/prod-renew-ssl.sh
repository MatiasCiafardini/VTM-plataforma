#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

docker compose --env-file .env.prod -f docker-compose.prod.yml stop nginx
certbot renew
docker compose --env-file .env.prod \
  -f docker-compose.prod.yml \
  -f docker-compose.prod.https.yml \
  up -d nginx

echo "SSL renewal flow completed."
