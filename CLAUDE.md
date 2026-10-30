# CLAUDE.md

Project: Service Request & Compliance Tracker (SRC-T). Full requirements in `SPEC.md` and the database design in `docs/erd.md` — read both before any feature work. Do not add or rename tables or columns without asking.

## Stack
- Backend: Python 3.12, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2
- DB: MySQL 8 (driver: PyMySQL), utf8mb4, InnoDB
- Background jobs: Celery + Celery Beat, Redis as broker
- Email (dev): Mailpit
- Auth: JWT (access token), passwords with passlib[bcrypt]
- Frontend: React + TypeScript + Vite, Tailwind CSS, TanStack Query, React Router
- Tests: pytest (backend), Vitest (frontend, optional)
- Everything runs with `docker compose up`

## Layout
```
backend/app/
  core/        config.py, security.py, deps.py (auth + role guards)
  models/      one file per table
  schemas/     Pydantic schemas
  routers/     auth, users, service_requests, invoices, contractors, documents, dashboard, audit
  services/    aging.py, compliance.py, notifications.py, audit.py
  tasks/       celery_app.py, invoice_jobs.py, document_jobs.py
backend/tests/
frontend/src/  pages/, components/, api/, hooks/
docs/          erd.png, schema.sql
```

## Commands
- Start all: `docker compose up --build`
- Migrations: `docker compose exec api alembic upgrade head`
- New migration: `docker compose exec api alembic revision --autogenerate -m "msg"`
- Seed demo data: `docker compose exec api python -m app.seed`
- Backend tests: `docker compose exec api pytest`
- Run jobs now (demo): `docker compose exec api python -m app.tasks.run_now`
- URLs: API docs http://localhost:8000/docs · Frontend http://localhost:5173 · Mailpit http://localhost:8025

## Feature workflow (follow for every feature)
1. Before writing any code for a feature, run `git branch --show-current`. If it is `main`, stop and remind me to create a branch: `git checkout -b feature/<short-name>`. Wait until I confirm.
2. Plan the feature and show me the plan before coding.
3. Build it, then run the tests. Do not call the feature done until tests pass and I have tried it. Remind me that I can run `/explain` on anything I do not fully understand.
4. When the feature works, remind me to run `/thermo-nuclear-code-quality-review` (review only, no changes). Do not run it yourself.
5. After I decide which review findings to fix, suggest a commit message. Never commit, push, or merge unless I ask.
6. Remind me to push the branch and open a pull request into `main` on GitHub.

## Rules
- Business logic lives in `services/`, not in routers. Aging and compliance are pure functions with unit tests.
- Store timestamps in UTC; compute "today" in Asia/Riyadh.
- Every write endpoint checks role via a dependency (`require_role(...)`) and writes to the audit log.
- Never send email inside a request; enqueue a Celery task.
- Notifications must be idempotent via `notification_log` unique constraint.
- Return clear 4xx errors; no stack traces to the client.
- Keep secrets in `.env` (provide `.env.example`), never commit `.env`.
- Work one feature at a time; run tests before saying a feature is done.
- If something still fails after two attempts, stop and suggest I run `/debug` instead of trying more fixes.
