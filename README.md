# src-tracker

Service Request & Compliance Tracker (SRC-T). Full spec in [SPEC.md](SPEC.md), database design
in [docs/erd.md](docs/erd.md), contributor instructions in [CLAUDE.md](CLAUDE.md).

This branch (`feature/project-setup`) is slice 1: project setup only — docker-compose, the
database schema, a health check, and one frontend page proving the stack is wired together. No
auth, no business features, no background jobs yet.

## Setup

```bash
cp .env.example .env
# edit .env: set real values for DB_PASSWORD, DB_ROOT_PASSWORD, SEED_PASSWORD

docker compose up --build
```

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
