# src-tracker

Service Request & Compliance Tracker (SRC-T). Full spec in [SPEC.md](SPEC.md), database design
in [docs/erd.md](docs/erd.md), contributor instructions in [CLAUDE.md](CLAUDE.md).

Built one slice at a time. So far: project setup (Docker, schema, seed, `/health`) and auth
(JWT login, role guards, the logged-in app shell with a role-based sidebar). The pages behind the
sidebar are "Coming soon" placeholders; business features, background jobs and email come in later
slices.

## Setup

```bash
cp .env.example .env
# edit .env: set real values for DB_PASSWORD, DB_ROOT_PASSWORD, SEED_PASSWORD, JWT_SECRET
# generate JWT_SECRET with:  openssl rand -hex 32

docker compose up --build
```

After pulling changes that add frontend dependencies, use `docker compose up --build -V`. The
frontend's `node_modules` is an anonymous volume, so without `-V` the container keeps the old
packages.

Once `db` is healthy and `api` is up:

```bash
docker compose exec api alembic upgrade head
docker compose exec api python -m app.seed
```

- API: http://localhost:8000/docs
- Frontend: http://localhost:5173
- MySQL (host access): `localhost:3307`

## Tests

```bash
docker compose exec api pytest
```

Tests run against a separate `srct_test` database (created the first time the `db_data` volume
is initialized, by `docker/mysql/init/01-test-db.sql`; to get it on an existing volume, run
`docker compose down -v` first) and never touch real data — a safety check in `tests/conftest.py` refuses to run migrations against
anything but `srct_test`.

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
