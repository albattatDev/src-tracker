---
name: debug
description: Systematically diagnose an error or something not working in this Docker-based FastAPI, MySQL, Celery, Redis and React project, find the root cause before changing code, and explain it.
disable-model-invocation: true
---

# Debug

Find the root cause first, then fix it with the smallest change, then explain it. Do not try fixes at random.

## 1. Reproduce

- Restate the problem in one sentence: what was expected, what happened.
- Reproduce it yourself (run the request, the test, the page, or the command). If it cannot be reproduced, say so and ask for the exact steps or error.

## 2. Gather evidence before touching code

Check the layer where the symptom appears, then follow the request through the stack:

- Containers: `docker compose ps` (is every service up and healthy?)
- Logs: `docker compose logs --tail=100 <service>` for `api`, `worker`, `beat`, `db`, `redis`, `frontend`
- API: call the endpoint directly (Swagger at http://localhost:8000/docs or `curl`) to separate backend from frontend problems
- Database: migration state (`alembic current`, `alembic heads`), and the actual rows if data looks wrong
- Celery: is the worker connected to Redis, is the task registered, did beat schedule it, is the email visible in Mailpit (http://localhost:8025)
- Frontend: browser console and network tab — status code, request URL, CORS, missing auth token
- Config: `.env` values, ports, service names used as hostnames inside Docker

## 3. Find the root cause

- State a hypothesis and the evidence for it.
- Confirm it with one check before changing anything.
- If the first hypothesis is wrong, say so and form the next one from new evidence.

## 4. Fix

- Make one change at a time, the smallest one that addresses the root cause, not the symptom.
- Do not change table or column design without asking (see `CLAUDE.md`).
- Re-run the reproduction and the related tests to confirm the fix.
- If the fix touched logic, add or update a test that would have caught the bug.

## 5. Explain

Explain in Arabic, starting each line with an Arabic word, keeping commands and technical terms in English:

- **السبب الجذري:** what actually went wrong and why.
- **الدليل:** which log line, response, or check showed it.
- **الإصلاح:** what changed and why it fixes the cause.
- **الدرس:** how to spot this kind of problem faster next time.

## Stop conditions

If two hypotheses fail, or the fix needs a large change, stop and explain what is known so far and the options, and let the user decide.
