# Deploy en VPS Ubuntu

Este proyecto ya queda preparado para levantar en un VPS Linux con Docker Compose, usando:

- `nginx` como reverse proxy publico
- `frontend` Next.js en `3005`
- `backend` NestJS en `3004`
- `postgres` persistente en volumen Docker

## Flujo recomendado de deploy

Para no olvidarte pasos ni romper SSL, este es el flujo que conviene usar siempre:

1. En tu maquina local:

```bash
git add .
git commit -m "descripcion del cambio"
git push origin main
```

2. En la VPS:

```bash
cd /root/plataforma-vmt
chmod +x scripts/prod-deploy.sh
./scripts/prod-deploy.sh
```

Ese script hace:

- `git pull`
- `docker compose up -d --build`
- `prisma migrate deploy`
- chequeos de `nginx`, frontend, backend y dominio
- si detecta certificados en `/etc/letsencrypt/live/plataformavmt.com/`, activa tambien el compose HTTPS

Si quieres forzar modos:

```bash
./scripts/prod-deploy.sh --with-ssl
./scripts/prod-deploy.sh --without-ssl
./scripts/prod-deploy.sh --skip-pull
./scripts/prod-deploy.sh --skip-migrate
```

Importante:

- no corras `seed` en produccion salvo que quieras cargar datos demo
- `git pull` y `docker compose up -d --build` no borran datos
- `prisma migrate deploy` modifica esquema, pero no resetea la base

## 1. Datos de este entorno

- SO del VPS: Ubuntu
- Dominio: `plataformavmt.com`
- IP publica: `187.77.250.61`

## 2. Preparar DNS

Antes de pedir HTTPS, apunta estos registros al VPS:

- Tipo `A` para `plataformavmt.com` -> `187.77.250.61`
- Tipo `A` para `www.plataformavmt.com` -> `187.77.250.61`

Si usas Cloudflare:

- durante la primera puesta en marcha conviene dejar la nube en gris
- despues podes volver a activar proxy si queres

## 3. Instalar Docker en Ubuntu

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg git
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER
```

Cierra sesion y vuelve a entrar para que aplique el grupo `docker`.

## 4. Abrir firewall

Si tienes `ufw` activo:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

## 5. Clonar y preparar variables

```bash
git clone <tu-repo>
cd "Plataforma VMT"

cp .env.prod.example .env.prod
cp tattoo-platform-backend/.env.production.example tattoo-platform-backend/.env.production
cp tattoo-platform-frontend/.env.production.example tattoo-platform-frontend/.env.production
```

Edita estos archivos antes de levantar:

- `.env.prod`
- `tattoo-platform-backend/.env.production`
- `tattoo-platform-frontend/.env.production`

Valores importantes:

- `POSTGRES_PASSWORD`: password real de la base
- `JWT_SECRET`: string largo y aleatorio
- `DATABASE_URL` y `PRISMA_DIRECT_URL`: deben usar la misma password que `POSTGRES_PASSWORD`
- `BACKEND_API_URL`: dejar `http://backend:3004/api` cuando uses Docker Compose

## 6. Levantar el stack

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

La app queda disponible en:

- `http://TU_IP/`
- `http://plataformavmt.com/`
- `http://plataformavmt.com/docs`

## 7. Seed inicial opcional

Si queres cargar datos demo:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml exec backend node prisma/seed.mjs
```

## 8. Verificar que quedo arriba

```bash
docker ps
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f
curl -I http://plataformavmt.com
curl http://plataformavmt.com/docs
```

## 9. HTTPS con Certbot y Nginx Docker

Cuando el dominio ya resuelva a la IP correcta:

```bash
sudo apt update
sudo apt install -y certbot

cd /root/plataforma-vmt
docker compose --env-file .env.prod -f docker-compose.prod.yml stop nginx
certbot certonly --standalone -d plataformavmt.com -d www.plataformavmt.com

docker compose --env-file .env.prod \
  -f docker-compose.prod.yml \
  -f docker-compose.prod.https.yml \
  up -d nginx
```

Si despues de generar certificados quieres usar el flujo automatizado:

```bash
cd /root/plataforma-vmt
./scripts/prod-deploy.sh --with-ssl
```

Despues de eso la app queda en:

- `https://plataformavmt.com`
- `https://www.plataformavmt.com`

Para renovar certificados:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml stop nginx
certbot renew
docker compose --env-file .env.prod \
  -f docker-compose.prod.yml \
  -f docker-compose.prod.https.yml \
  up -d nginx
```

## 10. Corregir el email admin legado

Si el seed dejo el admin con el dominio viejo, puedes corregirlo sin tocar SQL:

```bash
cd /root/plataforma-vmt
docker compose --env-file .env.prod -f docker-compose.prod.yml exec \
  -e OLD_ADMIN_EMAIL=admin@plataformavtm.com \
  -e NEW_ADMIN_EMAIL=admin@plataformavmt.com \
  backend npm run admin:rename-email
```

Despues puedes volver a correr el seed:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml exec backend node prisma/seed.mjs
```

## 11. Comandos utiles

Ver logs:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f
```

Rebuild despues de cambios:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

Bajar servicios:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml down
```

Deploy completo con script:

```bash
cd /root/plataforma-vmt
./scripts/prod-deploy.sh
```

Verificar HTTP y HTTPS:

```bash
curl -I http://plataformavmt.com
curl -I https://plataformavmt.com
curl -I http://www.plataformavmt.com
curl -I https://www.plataformavmt.com
```

Si `http` responde y `https` no, la app esta viva pero falta SSL en `443`.

## 12. Siguiente paso recomendado

Cuando ya responda por dominio, conviene agregar:

- backups del volumen de Postgres

## 13. Automatizar backups y SSL

Scripts disponibles en el repo:

- `scripts/prod-backup-db.sh`
- `scripts/prod-renew-ssl.sh`

Dar permisos:

```bash
cd /root/plataforma-vmt
chmod +x scripts/prod-backup-db.sh
chmod +x scripts/prod-renew-ssl.sh
mkdir -p backups
```

Probar backup manual:

```bash
cd /root/plataforma-vmt
BACKUP_DIR=/root/plataforma-vmt/backups ./scripts/prod-backup-db.sh
```

Agregar cron diario para backup:

```bash
crontab -e
```

Linea sugerida:

```cron
0 3 * * * cd /root/plataforma-vmt && BACKUP_DIR=/root/plataforma-vmt/backups ./scripts/prod-backup-db.sh >> /var/log/vmt-backup.log 2>&1
```

Agregar cron mensual para renovacion SSL:

```cron
0 4 1 * * cd /root/plataforma-vmt && ./scripts/prod-renew-ssl.sh >> /var/log/vmt-ssl-renew.log 2>&1
```
