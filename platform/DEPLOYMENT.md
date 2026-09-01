# Deploying Glampack HR to a VPS

Assumes: a VPS with Docker + Docker Compose installed, SSH access, and a domain's DNS `A` record already pointed at the VPS's IP.

## 1. First-time setup

```bash
git clone <this-repo> && cd platform
cp .env.example .env
# Edit .env: set DOMAIN, POSTGRES_PASSWORD, FIREBASE_SERVICE_ACCOUNT_JSON, AWS_* / S3_BUCKET_NAME.
```

## 2. Issue the first SSL certificate (one-time, before nginx can start)

nginx's config references certificate files that don't exist yet, so it can't be the one to bootstrap them. Use certbot's standalone mode once, with nothing yet listening on port 80:

```bash
docker run --rm -p 80:80 \
  -v $(pwd)/certbot-certs:/etc/letsencrypt \
  certbot/certbot certonly --standalone \
  -d $DOMAIN --email you@example.com --agree-tos --no-eff-email

# Move the cert into the named volume docker-compose.yml expects:
docker volume create platform_certbot_certs
docker run --rm -v $(pwd)/certbot-certs:/from -v platform_certbot_certs:/to alpine cp -r /from/. /to/
```

## 3. Build and start everything

```bash
docker compose build
docker compose up -d postgres
docker compose run --rm api npx prisma migrate deploy   # schema must exist before api/web serve traffic
docker compose up -d
docker compose ps   # confirm postgres/api/web/nginx are all healthy/running
```

## 4. Verify

```bash
curl https://$DOMAIN/api/v1/../health   # -> {"status":"ok"}  (adjust path if proxied differently)
curl https://$DOMAIN/                    # the Next.js app
```

Check `docker compose logs -f api` if `/health` or `/ready` don't respond — `/ready` specifically checks the Postgres connection, so a 503 there means the DB isn't reachable yet.

## 5. Certificate renewal (recurring)

Once nginx is up and serving the ACME challenge path (`/.well-known/acme-challenge/`, already configured in `docker/nginx/templates/default.conf.template`), renewals can use the webroot method instead of standalone — no downtime, no port conflict:

```bash
docker compose --profile certbot run --rm certbot renew --webroot -w /var/www/certbot
docker compose exec nginx nginx -s reload
```

Add this as a monthly cron job on the VPS (`crontab -e`):

```
0 3 1 * * cd /path/to/platform && docker compose --profile certbot run --rm certbot renew --webroot -w /var/www/certbot && docker compose exec nginx nginx -s reload
```

## 6. Database backups

At minimum, a nightly `pg_dump` cron job:

```
0 2 * * * docker compose exec -T postgres pg_dump -U glampack glampack_hr | gzip > /path/to/backups/glampack_hr_$(date +\%Y\%m\%d).sql.gz
```

Prune old backups on whatever retention schedule fits (e.g. `find /path/to/backups -mtime +30 -delete`), and store copies off the VPS (S3, another host) — a backup that only exists on the same disk as the database it backs up doesn't protect against disk failure.

## 7. Redeploying after a code change

```bash
git pull
docker compose build
docker compose run --rm api npx prisma migrate deploy   # if the schema changed
docker compose up -d
```

Rebuilding `web` requires re-passing all `NEXT_PUBLIC_*` build args (they're read from `.env` automatically by `docker-compose.yml`'s `args:` section — no separate action needed unless one of those values itself changed, in which case update `.env` first).

## 8. Data migration from Airtable (one-time, at cutover)

See `scripts/migrate-airtable/.env.example`. Run the dry-run against a scratch database first and review the printed report — do not point it at this VPS's production database until you've reviewed it:

```bash
cd scripts/migrate-airtable
cp .env.example .env   # fill in AIRTABLE_API_KEY, FIREBASE_SERVICE_ACCOUNT_JSON, AWS_*, and a SCRATCH DATABASE_URL
npm run migrate:dry-run
# review the report, then point DATABASE_URL at the real VPS Postgres and re-run for real
```
