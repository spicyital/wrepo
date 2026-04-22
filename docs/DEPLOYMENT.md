# Deployment

This guide is the production path for `https://wrepo.org` on a self-hosted Ubuntu machine behind Cloudflare.

## Recommended model

Use **Cloudflare Tunnel** as the primary ingress layer.

Why this is the better fit for a one-person home-server setup:

- No inbound router port forwarding for `80` or `443`
- Origin IP stays private behind Cloudflare
- Fewer moving parts than public Nginx + Certbot on a residential connection
- Clean rollback path: stop the tunnel, keep app/data intact

Direct-origin Nginx is still supported as a fallback. The example config remains at [`docker/nginx.conf`](../docker/nginx.conf), but it is not the recommended live setup for `wrepo.org`.

## Target architecture

```text
Browser
  -> Cloudflare edge
  -> Cloudflare Tunnel
  -> cloudflared container
  -> web container (Next.js)
  -> db container (PostgreSQL)
```

Public exposure:

- `wrepo.org` and `www.wrepo.org` are proxied by Cloudflare
- No public inbound ports are opened on the home router
- Docker publishes `127.0.0.1:3000` and `127.0.0.1:5432` for on-host debugging only

## 1. Server preparation

Use Ubuntu 22.04+ or 24.04+.

Install Docker, Compose, Git, and UFW:

```bash
sudo apt update
sudo apt install -y ca-certificates curl git ufw
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
newgrp docker
```

Firewall recommendation:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw enable
sudo ufw status
```

For a Tunnel-based deployment, do **not** forward `80` or `443` on your router.

## 2. Clone and configure

```bash
git clone https://github.com/your-org/wrepo.git
cd wrepo
cp .env.example .env
mkdir -p storage backups
chmod 750 storage backups
chmod 600 .env
```

Edit `.env` and set these values before first deploy:

- `NODE_ENV=production`
- `APP_URL=https://wrepo.org`
- `NEXTAUTH_URL=https://wrepo.org`
- `NEXTAUTH_URL_INTERNAL=http://web:3000`
- `POSTGRES_PASSWORD=<strong random password>`
- `NEXTAUTH_SECRET=<openssl rand -base64 32>` and do not leave it blank or placeholder
- `HEALTHCHECK_TOKEN=<openssl rand -hex 32>`
- `ADMIN_EMAIL=<your email>`
- `ADMIN_PASSWORD=<strong bootstrap password>`
- `ADMIN_BOOTSTRAP=1` for first boot only, then set it back to `0`
- `STORAGE_HOST_PATH=./storage` or an absolute host path
- `BACKUP_ROOT=./backups` or an absolute host path

`NEXTAUTH_SECRET` is mandatory in production. Empty or placeholder values are rejected by the deploy script and by container startup. `docker-compose.yml` does not provide a fake production fallback.

Generate strong secrets:

```bash
openssl rand -base64 32
openssl rand -hex 32
```

## 3. Create the Cloudflare Tunnel

In the Cloudflare Zero Trust dashboard:

1. Create a new **Cloudflare Tunnel**
2. Choose the **Docker** connector type
3. Copy the generated tunnel token into `.env` as `CLOUDFLARE_TUNNEL_TOKEN`
4. Add a public hostname for `wrepo.org` with service `http://web:3000`
5. Add a second public hostname for `www.wrepo.org` with service `http://web:3000` if you want both hostnames live

Notes:

- Tunnel public hostnames create the needed DNS mapping in Cloudflare. You do not need a public `A` record to your home IP.
- Leave the records proxied through Cloudflare.
- The local service is intentionally `http://web:3000` inside Docker. The browser still gets HTTPS from Cloudflare at the edge.

## 4. Cloudflare DNS and SSL/TLS settings

DNS:

- `wrepo.org`: proxied through the tunnel
- `www.wrepo.org`: proxied through the tunnel or redirected to apex if you prefer a single hostname
- No direct `A` or `AAAA` record to the home server is needed for the app

SSL/TLS:

- For this tunnel-backed setup, Cloudflare terminates public HTTPS and forwards through the tunnel to `cloudflared`
- Keep the tunnel service itself as `http://web:3000`
- If this Cloudflare zone is dedicated to WRepo, `Full (strict)` is the safest general SSL/TLS mode for the zone
- If the same zone fronts other non-compliant origins, verify those first before changing the zone-wide SSL mode

Caching:

- Keep Cloudflare proxying enabled
- Do not add page-level HTML caching rules for authenticated routes
- Let Next.js and Cloudflare handle static assets normally
- Avoid caching `/api/*`, `/submit`, `/admin/*`, auth routes, or file URLs that may enforce access rules

## 5. First deployment

Run the production deploy script:

```bash
bash scripts/deploy-prod.sh
```

What it does:

- Builds the `web` image
- Starts `db`, `web`, and `cloudflared`
- Waits for the token-protected local health probe at `http://127.0.0.1:${WEB_PORT}/api/health`
- Prints service status

If you prefer the manual equivalent:

```bash
docker compose --profile tunnel up -d --build --remove-orphans
curl -fsS -H "X-WRepo-Health-Token: $HEALTHCHECK_TOKEN" http://127.0.0.1:3000/api/health
docker compose --profile tunnel ps
```

## 6. First boot tasks

If `ADMIN_BOOTSTRAP=1`, the container will upsert the admin user on boot. `ADMIN_EMAIL` and `ADMIN_PASSWORD` must both be set. Public signup creates a normal submitter account only, and bootstrap misconfiguration is treated as a blocking startup error.

After the first successful deploy:

1. Log in with the bootstrap admin account
2. Confirm admin review pages work
3. Set `ADMIN_BOOTSTRAP=0`
4. Redeploy so the bootstrap password is no longer re-applied on every restart

If you prefer a manual admin bootstrap:

```bash
docker compose exec web npm run admin:create
```

Use either `ADMIN_BOOTSTRAP=1` for first boot or the admin creation script. Do not rely on public signup for admin access.

## 7. Validate the live site

On the server:

```bash
curl -fsS -H "X-WRepo-Health-Token: $HEALTHCHECK_TOKEN" http://127.0.0.1:3000/api/health
docker compose --profile tunnel ps
docker compose logs web --tail 80
docker compose logs cloudflared --tail 80
```

Public checks:

- `https://wrepo.org/`
- `https://wrepo.org/search`
- `https://wrepo.org/api/papers`
- `https://wrepo.org/llms.txt`
- `https://wrepo.org/llms-full.txt`
- `https://wrepo.org/sitemap.xml`
- `https://wrepo.org/robots.txt`

Notes:

- `/api/health` is a local/container health probe, not a public-facing endpoint.
- `/api/upload` and `/api/auth/*` are internal authenticated application routes and are not part of the public discovery surface.

## 8. Ports and exposure

Expose as little as possible:

- Router: no inbound forwarding for the app
- Host firewall: allow SSH only
- Docker published ports remain bound to `127.0.0.1`
- PostgreSQL stays private to Docker plus local host only

If you later move to a VPS and want direct-origin HTTPS, use the fallback Nginx config and open only `80` and `443`.

## 9. Permissions and ownership

Recommended layout:

- Run deployment commands as a dedicated non-root user with Docker access
- Keep `.env` mode `600`
- Keep `storage/` and `backups/` owned by that deploy user
- Do not make uploaded files world-writable

Example:

```bash
sudo chown -R "$USER":"$USER" ./
chmod 600 .env
chmod 750 storage backups
```

## 10. Optional direct-origin fallback

If you later migrate away from Cloudflare Tunnel:

- `docker/nginx.conf` is the fallback reverse-proxy config
- It expects the app on `127.0.0.1:3000`
- You would then expose `80` and `443`, install certificates, and switch Cloudflare to a direct proxied DNS record

For ongoing maintenance, backups, restores, updates, and rollback, see [`docs/OPERATIONS.md`](./OPERATIONS.md).
