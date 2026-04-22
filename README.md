<<<<<<< HEAD
# wrepo
=======
# WRepo

A small, self-hosted academic paper repository for undergraduate theses, student research, and departmental scholarship. Designed to run on a single always-on Linux machine (a Chuwi HeroBox is fine), maintainable by one developer, and good enough for a real department archive behind a domain.

- **Stack** — Next.js 14 (App Router) + TypeScript, PostgreSQL + Prisma, Auth.js, Tailwind.
- **Ops** — Docker Compose + Nginx + Let's Encrypt, no external services required.
- **Swappable seams** — filesystem storage is behind an interface (S3 later), Postgres full-text search is behind an interface (Meilisearch/OpenSearch later). No caller changes when you migrate.

---

## Table of contents

1. [Quickstart](#quickstart)
2. [Architecture](#architecture)
3. [Paper lifecycle](#paper-lifecycle)
4. [Security model](#security-model)
5. [LLM discovery](#llm-discovery)
6. [Local development](#local-development)
7. [Environment variables](#environment-variables)
8. [Database migrations](#database-migrations)
9. [Deployment (Ubuntu + Nginx)](#deployment-ubuntu--nginx)
10. [Backups](#backups)
11. [Troubleshooting](#troubleshooting)
12. [Roadmap](#roadmap)
13. [License](#license)

---

## Quickstart

```bash
cp .env.example .env            # optional: npm install will create this automatically if missing
docker compose up -d --build    # brings up db + web, runs migrations automatically
docker compose exec web npm run admin:create   # optional if you prefer env-based bootstrap
docker compose exec web npm run db:seed        # optional demo papers
```

Open <http://localhost:3000>. The first account created at `/signup` becomes `super_admin`.

---

## Architecture

```
app/
  (public)/        Homepage, browse, search, paper detail, about — public site
  (auth)/          Login + submission form (require login)
  admin/           Editor/admin UI — gated by middleware.ts + layout guard
  api/             Route handlers: auth, JSON API, upload, file serving, health
  actions/         Server actions (submit/update/status transitions)
components/
  ui/              Button, Input, Card, Badge — minimal primitives
  admin/           Admin-only components (PaperForm, PapersTable, StatusBadge)
  Header/Footer    Public chrome
  PaperCard        Listing card used on homepage, browse, search
  PdfPreview       Client-side embedded PDF viewer
  CitationBlock    APA / MLA / BibTeX tabs with copy-to-clipboard
  JsonLd           Schema.org ScholarlyArticle tag
lib/
  db.ts            Prisma client (singleton, hot-reload safe)
  auth.ts          NextAuth config + role helpers (canEdit / canPublish / canSubmit)
  logger.ts        Structured JSON logging (level filter via LOG_LEVEL)
  slug.ts          Deterministic slug generator + uniqueness helper
  uploads.ts       PDF/image magic-byte validation, key generators
  utils.ts         cn(), formatDate, truncate, absoluteUrl
  validation/      Zod schemas — paperInputSchema is the source of truth
  storage/         StorageService interface + local-filesystem driver
  search/          SearchService interface + Postgres FTS driver
  papers/
    service.ts     Author/advisor/keyword upserts + status-transition rules
    related.ts     Related-paper scoring (shared keywords + same department)
prisma/
  schema.prisma    Data model
  migrations/      Hand-rolled init migration (schema + tsvector trigger in one)
  seed.ts          Demo data: 1 admin, 5 departments, 8 papers
scripts/
  create-admin.ts  Upsert a super_admin from env
docker/
  Dockerfile       Multi-stage build, non-root runtime, tini + healthcheck
  entrypoint.sh    Runs `prisma migrate deploy`, optional admin bootstrap, then next
  nginx.conf       Example TLS reverse-proxy config for wrepo.org
middleware.ts      Edge auth guard for /admin/* and /submit
storage/           Uploaded PDFs and covers (mounted volume in production)
docs/
  DEPLOYMENT.md    Full Ubuntu + Nginx + Certbot walkthrough
```

### Why the two interfaces?

`StorageService` and `SearchService` exist so the single-machine MVP can swap to S3 or Meilisearch without changing any caller. The init Postgres FTS trigger keeps the `searchVector` column in sync automatically — you can run a Meilisearch index beside it during migration.

---

## Paper lifecycle

Statuses: `draft → submitted → approved → published`, plus `rejected` and `archived` (soft-delete).

Allowed transitions — enforced in `lib/papers/service.ts#canTransition`:

| From        | To (allowed)                                  |
| ----------- | --------------------------------------------- |
| `draft`     | `submitted`, `archived`                       |
| `submitted` | `approved`, `rejected`, `archived`, `draft`   |
| `approved`  | `published`, `rejected`, `archived`, `submitted` |
| `rejected`  | `submitted`, `archived`, `draft`              |
| `published` | `approved` (unpublish), `archived`            |
| `archived`  | `approved`, `draft` (restore)                 |

`publishedAt` is set the first time a paper is published and **preserved** on unpublish → republish cycles. Archiving sets `deletedAt`; restoring clears it.

Editors and super_admins bypass the `submitted` state when they submit — their own submissions go straight to `approved`.

---

## Security model

- **Edge guard** (`middleware.ts`) rejects unauthenticated access to `/admin/*` and `/submit`, and sends non-editors away from `/admin/*` before any page renders.
- **Layout guards** on `/admin/*` and server actions re-check the role — defence in depth.
- **Server actions** (`submit/update/setPaperStatus`) always call `getServerSession` and validate with Zod before touching the DB.
- **File uploads** are validated by magic bytes, not just MIME type. PDFs must start with `%PDF-`; images must match PNG/JPEG/WebP/GIF signatures. Size limits: 25 MB PDF, 4 MB cover.
- **File serving** (`/api/files/*`) looks up the owning paper and refuses to serve PDFs for unpublished, embargoed, or soft-deleted papers unless the caller is an editor. Paths are normalized and path-traversal is blocked.
- **XSS** — `JsonLd` escapes `<` in embedded JSON-LD. Abstracts render as text, not HTML.
- **Headers** — `next.config.mjs` sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`.
- **Secrets** — `NEXTAUTH_SECRET` gates session tokens. Rotate rarely; rotating invalidates all active sessions.

---

## LLM discovery

WRepo exposes two plain-text discovery endpoints for LLMs, agents, and external tools:

- `/llms.txt` â€” a compact public summary of the repository, canonical entry points, data endpoints, and corpus rules.
- `/llms-full.txt` â€” a richer machine-oriented description of route patterns, metadata fields, filters, and access rules.

They help agents discover the public archive without crawling admin or submission routes blindly. Both files explicitly state that only published, public, non-embargoed paper content should be treated as open corpus material, and that file URLs may still enforce access rules.

---

## Local development

```bash
# 1. Install
npm install

# 2. Environment
cp .env.example .env
# Edit DATABASE_URL (host `localhost`), NEXTAUTH_SECRET, ADMIN_* at minimum.

# 3. Start Postgres (Compose is easiest; postgres:16-alpine)
docker compose up -d db
# If port 5432 is already in use locally, set POSTGRES_PORT=5433 in .env and
# update DATABASE_URL to match before starting Compose.

# 4. Migrate + seed
npx prisma migrate dev       # applies the checked-in migrations to your local database
npm run db:seed              # optional demo data
npm run admin:create         # bootstrap an admin user from env

# 5. Run
npm run dev
```

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server on :3000 |
| `npm run build && npm start` | Production build + serve |
| `npm run typecheck` | Strict TypeScript check, no emit |
| `npm run lint` | ESLint via `next lint` |
| `npm run prisma:migrate` | Create + apply a new migration in dev |
| `npm run prisma:deploy` | Apply migrations in production |
| `npm run prisma:studio` | DB browser on :5555 |
| `npm run db:seed` | Load demo papers |
| `npm run admin:create` | Upsert the admin user from env |

---

## Environment variables

Minimum you must set:

| Variable           | Notes |
| ------------------ | ----- |
| `DATABASE_URL`     | Postgres connection string. Use `db` host when running under Compose, `localhost` locally. |
| `NEXTAUTH_SECRET`  | `openssl rand -base64 32`. |
| `NEXTAUTH_URL`     | Full public URL (`https://wrepo.org` in prod). |
| `APP_URL`          | Public canonical URL used in metadata, sitemap, Open Graph. |
| `ADMIN_EMAIL`      | Optional env-based bootstrap admin login. |
| `ADMIN_PASSWORD`   | Optional env-based bootstrap admin password. |

Optional:

| Variable             | Default     | Notes |
| -------------------- | ----------- | ----- |
| `STORAGE_DRIVER`     | `local`     | Swap for `s3` once implemented. |
| `STORAGE_LOCAL_PATH` | `./storage` | Mounted volume in Compose. |
| `SEARCH_DRIVER`      | `postgres`  | Meilisearch/OpenSearch later. |
| `LOG_LEVEL`          | `info`      | `debug` / `info` / `warn` / `error`. |
| `ADMIN_BOOTSTRAP`    | `0`         | Set `1` to have the container run `create-admin` on start. |

Fresh databases also get a baseline set of departments via migrations, so `/submit` works before loading demo content. The first account created at `/signup` becomes the administrator automatically.

See `.env.example` for the full list.

---

## Database migrations

- Local dev: `npm run prisma:migrate` — creates a new migration from schema changes and applies it.
- Production: `prisma migrate deploy` runs automatically on container start via `docker/entrypoint.sh`.
- The initial migration at `prisma/migrations/0001_init/migration.sql` is hand-rolled so it creates the schema **and** installs the `searchVector` tsvector trigger in one shot. If you regenerate it, preserve the trigger block at the bottom.

### Adding FTS to a model field

Extend the trigger in a new migration:

```sql
CREATE OR REPLACE FUNCTION paper_search_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', coalesce(NEW."title", '')),    'A') ||
    setweight(to_tsvector('english', coalesce(NEW."subtitle", '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW."abstract", '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Backfill existing rows:
UPDATE "Paper" SET "title" = "title";
```

---

## Deployment (Ubuntu + Nginx)

Full walkthrough: **[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)**.

Short version:

```bash
# On the server
git clone https://github.com/your-org/wrepo.git && cd wrepo
cp .env.example .env
# Edit .env: NEXTAUTH_SECRET, NEXTAUTH_URL=https://wrepo.org, APP_URL, POSTGRES_PASSWORD, ADMIN_*

docker compose up -d --build
docker compose exec web npm run admin:create

sudo cp docker/nginx.conf /etc/nginx/sites-available/wrepo
sudo ln -s /etc/nginx/sites-available/wrepo /etc/nginx/sites-enabled/wrepo
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d wrepo.org -d www.wrepo.org
```

The `web` container listens on `127.0.0.1:3000`; the DB on `127.0.0.1:5432`. Nothing is exposed to the public internet directly — Nginx terminates TLS.

### Updating

```bash
git pull
docker compose build web
docker compose up -d web    # entrypoint runs `prisma migrate deploy` automatically
```

---

## Backups

Two things need backing up: the database and the storage directory.

```bash
# nightly cron
0 3 * * * cd /home/wrepo/wrepo && docker compose exec -T db \
  pg_dump -U wrepo wrepo | gzip > /var/backups/wrepo/db-$(date +\%F).sql.gz
5 3 * * * tar -czf /var/backups/wrepo/storage-$(date +\%F).tar.gz \
  -C /home/wrepo/wrepo storage
```

Copy `/var/backups/wrepo/*` off-site (Backblaze, S3, a second machine over rsync). Storage and DB must be restored together — file keys in the DB point at files on disk.

### Restore

```bash
gunzip < db-YYYY-MM-DD.sql.gz | docker compose exec -T db psql -U wrepo -d wrepo
tar -xzf storage-YYYY-MM-DD.tar.gz
```

---

## Troubleshooting

**`prisma migrate deploy` fails with "relation does not exist".**
Your DB is in a half-migrated state. Either drop the DB (`docker compose down -v` wipes it) and re-bring-up, or apply `prisma migrate resolve --applied 0001_init` if the schema is actually in place.

**Can't log in — "Invalid email or password".**
Run `docker compose exec web npm run admin:create` with `ADMIN_EMAIL` and `ADMIN_PASSWORD` set in `.env`. The script upserts — you can use it to reset the password.

**Uploads fail with "file too large" at the proxy.**
Check `client_max_body_size` in your Nginx config (the example uses 30 MB). Also `serverActions.bodySizeLimit` in `next.config.mjs` (25 MB).

**Uploaded PDF is downloadable but can't be previewed.**
Some browsers block embedded PDFs from domains without a `Content-Security-Policy: frame-ancestors`. Open the file in a new tab to confirm it works, then relax the CSP only if needed.

**"Unknown department" on submit.**
Baseline departments are created by the checked-in migrations. If you see this on a fresh setup, rerun `npx prisma migrate dev` and confirm you're pointing at the intended database in `.env`.

---

## Roadmap

The codebase is shaped to make these extensions small, not speculative:

- Email notifications (approval, publication) — hook points in `lib/papers/service.ts`
- Moderation notes & per-paper review threads
- DOI minting via Crossref / DataCite
- OAI-PMH endpoint for harvesters — `/api/papers` is already the right shape
- Multi-collection / multi-journal support
- Institutional branding overrides (logo, colour)
- ORCID sign-in (the `orcid` column is already on Author and User)

---

## License

Code: MIT (add a `LICENSE` file when publishing).
Uploaded content: per-paper — see each paper's listed license.
>>>>>>> b7f6a9b (Prepare production deploy for chuwi)
