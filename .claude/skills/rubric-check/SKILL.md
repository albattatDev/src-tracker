---
name: rubric-check
description: Check the project against the assignment's functional requirements, evaluation criteria, and deliverables, and report what is met, partial, or missing with evidence.
disable-model-invocation: true
---

# Rubric Check

Audit the repository against the assignment's requirements and evaluation criteria. This is a report only: do not change any code or files.

Read `SPEC.md` (including the Assumptions section) and `docs/erd.md` first. A requirement that the Assumptions section deliberately changes counts as met if the code follows the assumption.

## How to check each item

- Find concrete evidence in the code: a file path and function, class, test, or config. Open the file to confirm; do not rely on file names alone.
- Where possible, verify by running something cheap: the test suite, `alembic heads`, a request against `/docs`, or a grep.
- Mark each item:
  - ✓ met — with evidence (`path/to/file.py:function`)
  - ◐ partial — say exactly what is missing
  - ✗ missing
- Never mark ✓ without evidence.

## Checklist

### A. Service requests
- Operations can create an SR; required fields: requester, date/time, priority (low/medium/high), description, assigned engineer
- SR can be assigned to a specific engineer
- Status lifecycle Open → Assigned → In Progress → Resolved → Closed, invalid transitions rejected

### B. Invoice compliance and aging
- Invoices can be added and are linked to an SR (foreign key)
- Age calculated from due date (falling back to submission date)
- Bands: < 30 green, 30–59 yellow, 60–180 orange, > 180 red; shown in the UI
- Daily background job sends email at 30, 60 and 180 days to engineer and manager
- Each threshold alert is sent only once (unique constraint + check)
- Alerts stop after approval

### C. Contractor safety documents
- Contractor list maintained
- Documents HIP, JSA, CCSP, CWQAP, JOB-X can be uploaded per contractor
- Each document has an expiry date
- Valid / Expired status shown per document
- Alert to contractor and internal manager 30 days before expiry, once

### Database design
- Normalized: separate tables for users, service requests, invoices, contractors, documents; no duplicated data (names come from users)
- Foreign keys correct (e.g. invoice → service request)
- Indexes on frequently queried fields (assigned_engineer_id, expiry_date, and others in `docs/erd.md`)

### Backend logic
- Dates: UTC storage, Asia/Riyadh "today", boundary days handled
- Notification engine decoupled (Celery worker, not in the request)
- Passwords hashed
- RBAC enforced on every write endpoint (operations create SRs, only managers approve invoices, etc.)
- All endpoints except login/health require authentication

### Frontend
- Dashboard shows overdue invoices and expiring documents
- SRs can be filtered by engineer, status, and date; sorting works
- Works on small screens (check responsive classes on main pages)

### Code quality
- Readable, consistent style; comments where logic is not obvious
- Modular: routers / services / models / tasks separated, no business logic in routers
- Errors handled gracefully, including email send failure (retry, logged, job continues)

### Deliverables
- Repository pushed
- ER diagram and/or SQL dump in `docs/`
- Swagger/OpenAPI available at `/docs` and endpoints documented
- README with install and run steps, and the Assumptions list
- Demo flow possible: create SR → assign → add invoice and see aging change → upload document and see expiry alert (check seed data and `run_now` support this)

### Bonus
- Unit tests for aging logic and notification triggers (run them and report results)
- Dockerfile and docker-compose.yml; `docker compose up` starts everything
- WebSocket dashboard update on new SR
- Audit log records who changed what and when

## Output

1. A table per section: item | status | evidence or what is missing.
2. A short list titled **Fix first**: the missing or partial items that cost the most in evaluation, ordered by impact divided by effort. Include a rough size for each (small / medium / large).
3. Test results summary if tests were run.

Write the report in Arabic, keeping item names, paths, and technical terms in English. Start each line with an Arabic word.
