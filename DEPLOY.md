# Deploy en VPS Ubuntu

Este proyecto ya queda preparado para levantar en un VPS Linux con Docker Compose, usando:

- `nginx` como reverse proxy publico
- `frontend` Next.js en `3005`
- `backend` NestJS en `3004`
- `postgres` persistente en volumen Docker

## 1. Datos de este entorno

- SO del VPS: Ubuntu
- Dominio: `plataformavtm.com`
- IP publica: `187.77.250.61`

## 2. Preparar DNS

Antes de pedir HTTPS, apunta estos registros al VPS:

- Tipo `A` para `plataformavtm.com` -> `187.77.250.61`
- Tipo `A` para `www.plataformavtm.com` -> `187.77.250.61`

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
- `http://plataformavtm.com/`
- `http://plataformavtm.com/docs`

## 7. Seed inicial opcional

Si queres cargar datos demo:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml exec backend node prisma/seed.mjs
```

## 8. Verificar que quedo arriba

```bash
docker ps
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f
curl -I http://plataformavtm.com
curl http://plataformavtm.com/docs
```

## 9. HTTPS con Certbot en Ubuntu

Cuando el dominio ya resuelva a la IP correcta:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo apt stop nginx 2>/dev/null || true
sudo certbot certonly --standalone -d plataformavtm.com -d www.plataformavtm.com
```

Este proyecto hoy deja `nginx` adentro de Docker. Para poner HTTPS hay 2 caminos:

- rapido y prolijo: reemplazar `nginx` por `caddy` en Docker para certificados automaticos
- tradicional: montar los certificados de Let's Encrypt dentro del contenedor `nginx` y agregar listener `443`

Si queres ir por dominio desde el dia uno, te recomiendo que en el proximo paso te lo deje migrado a `caddy`, porque te simplifica bastante la renovacion SSL.

## 10. Comandos utiles

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

## 11. Siguiente paso recomendado

Cuando ya responda por dominio, conviene agregar:

- HTTPS con Caddy o Certbot
- backups del volumen de Postgres
