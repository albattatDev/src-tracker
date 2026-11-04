# src-tracker

Service Request & Compliance Tracker (SRC-T). Full spec in [SPEC.md](SPEC.md), database design
in [docs/erd.md](docs/erd.md), contributor instructions in [CLAUDE.md](CLAUDE.md).

Built one slice at a time. So far: project setup (Docker, schema, seed, `/health`) and auth
(JWT login, role guards, the logged-in app shell with a role-based sidebar). The pages behind the
sidebar are "Coming soon" placeholders; business features, background jobs and email come in later
slices.

## Setup

From a clean machine, in this order:

```bash
# 1. Configure
cp .env.example .env
# edit .env: set real values for DB_PASSWORD, DB_ROOT_PASSWORD, SEED_PASSWORD, JWT_SECRET
# generate JWT_SECRET with:  openssl rand -hex 32

# 2. Build and start everything in the background
docker compose up -d --build

# 3. Wait until the api is ready (it applies the database migrations first, then serves)
until curl -fs http://localhost:8000/health; do sleep 2; done

# 4. Load the demo data (safe to run again: it never creates duplicates)
docker compose exec api python -m app.seed

# 5. Run the invoice and document alert scans now instead of waiting for 06:00
docker compose exec api python -m app.tasks.run_now
```

There is no manual migration step: the `api` container runs `alembic upgrade head` before it
starts uvicorn, and exits with the error if a migration fails (`docker compose logs api`). The
`worker` and `beat` containers start only after the api is healthy.

- App: http://localhost:5173
- API docs: http://localhost:8000/docs
- Mailpit (alert emails): http://localhost:8025
- MySQL (host access): `localhost:3307`

The `api` container runs in dev mode: uvicorn is started with `--reload`, so edits under
`backend/` restart it automatically. Not for production.

> **Warning:** `docker compose down -v` deletes the local database and uploaded files. Use plain
> `docker compose down` to stop without losing data.

After pulling changes that add frontend dependencies, use `docker compose up -d --build -V`. The
frontend's `node_modules` is an anonymous volume, so without `-V` the container keeps the old
packages.

## Tests

```bash
docker compose exec api pytest
```

Tests run against a separate `srct_test` database (created the first time the `db_data` volume
is initialized, by `docker/mysql/init/01-test-db.sql`; to get it on an existing volume, run
`docker compose down -v` first) and never touch real data — a safety check in `tests/conftest.py` refuses to run migrations against
anything but `srct_test`.

## Email alerts (Celery + Mailpit)

`docker compose up -d` also starts `redis`, `mailpit`, a Celery `worker` and `beat`. Beat runs one
invoice scan and one document scan every day at 06:00 Asia/Riyadh; the worker sends the emails.
Each alert goes out once per threshold (invoices 30/60/180, documents 30 days), tracked in
`notification_log`. A failed send is retried 3 times, and a later scan retries it again.

Demo without waiting for 06:00:

```bash
docker compose exec api python -m app.tasks.run_now   # claims + enqueues; the worker sends
```

(This is step 5 of Setup.) Then open Mailpit at http://localhost:8025. Running it again sends nothing new.

## Seed users

Password for all demo users is `SEED_PASSWORD` from `.env`.

| Name | Email | Role |
|---|---|---|
| Admin User | admin@srct.local | admin |
| Abdullah Alqahtani | manager@srct.local | manager |
| Fahad Alharbi | engineer1@srct.local | engineer (reports to Abdullah) |
| Saad Alotaibi | engineer2@srct.local | engineer (reports to Abdullah) |
| Noura Alshehri | operations@srct.local | operations |

Running the seed again does not create duplicates.

## Known limits

- No rate limiting on `/auth/login`.
- Log out only clears the token in the browser. The token stays valid until it expires (8 hours),
  although deactivating a user blocks it immediately.
- The access token is kept in the browser's `localStorage`, so any cross-site scripting (XSS) bug
  could read it. Nothing in the app renders untrusted HTML today; keep it that way.
- The frontend role guards only decide what to show. The real enforcement is `require_role` on each
  API endpoint.
