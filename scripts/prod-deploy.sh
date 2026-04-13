#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-.env.prod}"
COMPOSE_FILES=(-f docker-compose.prod.yml)
WITH_SSL="auto"
SKIP_PULL="false"
SKIP_MIGRATE="false"
GIT_REMOTE="${GIT_REMOTE:-origin}"
GIT_BRANCH="${GIT_BRANCH:-main}"
DOMAIN="${DOMAIN:-plataformavmt.com}"

log() {
  printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

fail() {
  printf '\n[ERROR] %s\n' "$*" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Uso:
  ./scripts/prod-deploy.sh [opciones]

Opciones:
  --with-ssl       Fuerza levantar nginx con docker-compose.prod.https.yml
  --without-ssl    Fuerza deploy solo HTTP
  --skip-pull      No hace git pull
  --skip-migrate   No corre prisma migrate deploy
  -h, --help       Muestra esta ayuda

Variables opcionales:
  ENV_FILE=.env.prod
  GIT_REMOTE=origin
  GIT_BRANCH=main
  DOMAIN=plataformavmt.com
EOF
}

while (($# > 0)); do
  case "$1" in
    --with-ssl)
      WITH_SSL="true"
      ;;
    --without-ssl)
      WITH_SSL="false"
      ;;
    --skip-pull)
      SKIP_PULL="true"
      ;;
    --skip-migrate)
      SKIP_MIGRATE="true"
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fail "Opcion no reconocida: $1"
      ;;
  esac
  shift
done

cd "$ROOT_DIR"

[[ -f "$ENV_FILE" ]] || fail "No existe $ENV_FILE en $ROOT_DIR"
[[ -f docker-compose.prod.yml ]] || fail "No existe docker-compose.prod.yml"

if [[ "$SKIP_PULL" != "true" ]]; then
  log "Actualizando codigo desde $GIT_REMOTE/$GIT_BRANCH"
  git fetch "$GIT_REMOTE" "$GIT_BRANCH"
  git pull "$GIT_REMOTE" "$GIT_BRANCH"
else
  log "Saltando git pull"
fi

log "Ultimo commit"
git log -1 --oneline

SSL_CERT_PATH="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
if [[ "$WITH_SSL" == "auto" ]]; then
  if [[ -f "$SSL_CERT_PATH" && -f docker-compose.prod.https.yml ]]; then
    WITH_SSL="true"
  else
    WITH_SSL="false"
  fi
fi

if [[ "$WITH_SSL" == "true" ]]; then
  [[ -f docker-compose.prod.https.yml ]] || fail "Pediste SSL pero falta docker-compose.prod.https.yml"
  [[ -f "$SSL_CERT_PATH" ]] || fail "Pediste SSL pero no existe $SSL_CERT_PATH"
  COMPOSE_FILES+=(-f docker-compose.prod.https.yml)
  log "Deploy con HTTPS habilitado"
else
  log "Deploy solo HTTP"
fi

log "Reconstruyendo y levantando contenedores"
docker compose --env-file "$ENV_FILE" "${COMPOSE_FILES[@]}" up -d --build

if [[ "$SKIP_MIGRATE" != "true" ]]; then
  log "Aplicando migraciones Prisma"
  docker compose --env-file "$ENV_FILE" -f docker-compose.prod.yml exec backend npx prisma migrate deploy
else
  log "Saltando prisma migrate deploy"
fi

log "Estado de contenedores"
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

log "Chequeos locales"
curl -fsSI http://127.0.0.1 >/dev/null || fail "Nginx no responde en http://127.0.0.1"
curl -fsSI http://127.0.0.1:3005 >/dev/null || fail "Frontend no responde en http://127.0.0.1:3005"
curl -fsSI http://127.0.0.1:3004/api/health >/dev/null || fail "Backend no responde en http://127.0.0.1:3004/api/health"

log "Chequeos por dominio"
curl -fsSI "http://$DOMAIN" >/dev/null || fail "El dominio http://$DOMAIN no responde"

if [[ "$WITH_SSL" == "true" ]]; then
  curl -fsSI "https://$DOMAIN" >/dev/null || fail "El dominio https://$DOMAIN no responde"
fi

log "Deploy terminado correctamente"
printf '\nResumen:\n'
printf '  - HTTP:  http://%s\n' "$DOMAIN"
if [[ "$WITH_SSL" == "true" ]]; then
  printf '  - HTTPS: https://%s\n' "$DOMAIN"
else
  printf '  - HTTPS: no habilitado en este deploy\n'
fi
