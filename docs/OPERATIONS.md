# Operations

This runbook covers maintenance, backups, restores, updates, rollback, and failure handling for the production WRepo deployment.

## Daily commands

Check service state:

```bash
docker compose --profile tunnel ps
docker compose logs web --tail 80
docker compose logs cloudflared --tail 80
docker compose logs db --tail 80
```

Check app health:

```bash
curl -fsS -H "X-WRepo-Health-Token: $HEALTHCHECK_TOKEN" http://127.0.0.1:3000/api/health
```

## Backups

Run the built-in backup script:

```bash
bash scripts/backup-prod.sh
```

It creates a timestamped directory under `BACKUP_ROOT` containing:

- `db.sql.gz`
- `storage.tar.gz` if uploads exist
- `revision.txt` when Git metadata is available
- `SHA256SUMS` when `sha256sum` is installed

Suggested cron:

```bash
0 3 * * * cd /home/wrepo/wrepo && bash scripts/backup-prod.sh >> /var/log/wrepo-backup.log 2>&1
```

Keep at least:

- one recent on-host backup
- one off-host backup copy
- one backup taken immediately before each production update

## Restore procedure

This is destructive to the target database and storage directory. Restore DB and uploads from the same backup set.

1. Stop the application:

```bash
docker compose --profile tunnel down
```

2. Start only PostgreSQL:

```bash
docker compose up -d db
```

3. Restore the database:

```bash
gunzip < /path/to/db.sql.gz | docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

4. Restore uploaded files:

```bash
rm -rf storage
mkdir -p storage
tar -xzf /path/to/storage.tar.gz
```

5. Start the full stack again:

```bash
bash scripts/deploy-prod.sh
```

If your restore tarball was created from a custom absolute `STORAGE_HOST_PATH`, extract it back to that same location instead of `./storage`.

## Update procedure

Safe update sequence:

1. Take a backup:

```bash
bash scripts/backup-prod.sh
```

2. Pull the target revision:

```bash
git fetch --tags
git checkout <tag-or-commit>
```

3. Review `.env` changes if the release changed config requirements

4. Redeploy:

```bash
bash scripts/deploy-prod.sh
```

5. Run the validation checklist at the end of this file

## Rollback procedure

If the new release fails but **did not** introduce a breaking schema or data change:

```bash
git checkout <previous-good-tag-or-commit>
bash scripts/deploy-prod.sh
```

If the failed release **did** change schema or data incompatibly:

1. Stop the stack
2. Restore the database backup taken before the deploy
3. Restore the matching uploads backup
4. Check out the previous good revision
5. Redeploy

This is why pre-deploy backups are mandatory.

## Automatic restart after reboot

The Compose services use `restart: unless-stopped`, so Docker will bring them back after host reboot once the Docker service starts.

On Ubuntu, verify:

```bash
sudo systemctl enable docker
sudo systemctl status docker
```

## Security notes

- Use long random values for `POSTGRES_PASSWORD` and `NEXTAUTH_SECRET`
- Use a long random `HEALTHCHECK_TOKEN` for the local/container probe
- `NEXTAUTH_SECRET` is required in production; empty or placeholder values are rejected at deploy/startup time
- `docker-compose.yml` does not provide a fake production fallback for `NEXTAUTH_SECRET`
- Set `ADMIN_BOOTSTRAP=1` only for first boot or deliberate password reset windows
- If `ADMIN_BOOTSTRAP=1`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` are both required
- Treat admin bootstrap failure as a blocking startup error, not a warning
- Public signup creates `submitter` accounts only; create the first admin explicitly with `ADMIN_BOOTSTRAP=1` or `npm run admin:create`
- Change it back to `0` after bootstrap
- Keep `.env` readable only by the deploy user
- Keep Docker ports bound to `127.0.0.1`
- Do not expose PostgreSQL publicly
- Do not create direct public DNS records to the home server for the app
- If Cloudflare Tunnel is in front, the origin should accept only local traffic and tunnel egress
- Treat `/api/health` as a local-only operational probe, not a public product route
- Treat `/api/auth/*` and `/api/upload` as internal application routes, not public APIs
- Treat `/api/papers` as the intentionally public JSON metadata surface, limited to published records

## Common failure cases

### Tunnel is down

Symptoms:

- Cloudflare serves origin or tunnel errors
- `docker compose logs cloudflared` shows authentication or connectivity failures

Checks:

```bash
docker compose logs cloudflared --tail 120
docker compose --profile tunnel ps
```

Typical causes:

- invalid or rotated `CLOUDFLARE_TUNNEL_TOKEN`
- public hostname deleted in Cloudflare
- outbound firewall blocks tunnel traffic

### App unhealthy

Symptoms:

- `/api/health` fails locally
- `web` container restarts repeatedly

Checks:

```bash
docker compose logs web --tail 120
curl -fsS -H "X-WRepo-Health-Token: $HEALTHCHECK_TOKEN" http://127.0.0.1:3000/api/health
```

Typical causes:

- bad `DATABASE_URL`
- failed Prisma migration
- blank or placeholder `NEXTAUTH_SECRET` in production
- `ADMIN_BOOTSTRAP=1` without `ADMIN_EMAIL` or `ADMIN_PASSWORD`
- storage mount is missing or not writable
- `NEXTAUTH_URL` mismatch after domain changes

### Database problems

Symptoms:

- `db` is unhealthy
- Prisma migration retries fail at startup

Checks:

```bash
docker compose logs db --tail 120
docker compose exec db pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

Typical causes:

- bad credentials in `.env`
- corrupted or missing Docker volume
- disk full on the host

### Uploads fail

Symptoms:

- submission form rejects files
- uploaded files disappear after restart

Checks:

- confirm `STORAGE_HOST_PATH` points at a persistent host directory
- confirm that directory exists and is writable by the container
- confirm file requests under `/api/files/*` are not being cached or blocked incorrectly

### Login or callback issues

Symptoms:

- session cookies do not stick
- auth callbacks redirect to the wrong origin

Checks:

- `NEXTAUTH_URL=https://wrepo.org`
- `NEXTAUTH_URL_INTERNAL=http://web:3000`
- Cloudflare public hostname points to the right service

## Moving later from home server to VPS

Migration path:

1. Provision the VPS
2. Copy the repo and `.env`
3. Restore database and uploads from backup
4. Run `bash scripts/deploy-prod.sh`
5. Point the existing tunnel hostname at the new connector, or replace the tunnel with direct-origin Nginx if you want

Keeping Cloudflare Tunnel on the VPS is the lowest-friction move because app configuration stays almost identical.

If you later switch to direct-origin mode:

- deploy Nginx from [`docker/nginx.conf`](../docker/nginx.conf)
- install an origin certificate
- open `80` and `443`
- move Cloudflare DNS from tunnel-managed hostnames to direct proxied records

## Validation checklist

Use this after every deploy or rollback:

- `docker compose --profile tunnel ps` shows `web`, `db`, and `cloudflared` healthy/running
- `curl -fsS -H "X-WRepo-Health-Token: $HEALTHCHECK_TOKEN" http://127.0.0.1:3000/api/health` succeeds
- home page loads at `https://wrepo.org/`
- login works
- paper submission works
- upload succeeds and the stored file can be accessed under the expected permissions
- admin review and publish flow works
- newly published paper appears on the home page
- search returns the paper
- public paper page loads correctly
- `https://wrepo.org/api/papers` responds
- `https://wrepo.org/llms.txt` responds
- `https://wrepo.org/llms-full.txt` responds
- `https://wrepo.org/sitemap.xml` responds
