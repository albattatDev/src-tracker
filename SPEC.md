# SPEC — Service Request & Compliance Tracker (SRC-T)

## 1. Goal

A full-stack web app where Operations submit Service Requests (SRs) to Maintenance, invoices linked to SRs are tracked for aging, and contractor safety documents are tracked for expiry. Daily background jobs send email alerts at defined thresholds, once per threshold.

## 2. Roles (RBAC)

| Role         | Can do                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------ |
| `operations` | Create SRs, view own SRs                                                                               |
| `engineer`   | View SRs assigned to them, update status (In Progress, Resolved), add invoices to SRs assigned to them |
| `manager`    | Everything above + assign SRs, close SRs, approve/reject invoices, manage contractors & documents      |
| `admin`      | Manage users and roles + view all service requests (read-only)                                         |

All API endpoints require a JWT except `/auth/login` and `/health`. Passwords hashed with bcrypt (or argon2).

## 3. Module A — Service Requests

- Fields: requester (user), title, description, priority (`low|medium|high`), status, assigned_engineer (nullable), created_at, updated_at.
- Status lifecycle: `open → assigned → in_progress → resolved → closed`.
  - Assigning an engineer moves `open → assigned`.
  - Invalid transitions return 400.
- List endpoint supports filtering by engineer, status, priority, date range; sorting by created_at / priority; pagination.

## 4. Module B — Invoice Compliance & Aging

- Invoice fields: service_request_id (FK), invoice_number (unique), amount (SAR), submission_date, due_date, approval_status (`pending|approved|rejected`), approved_by, approved_at.
- Only `manager` can approve/reject.
- **Aging rule (decision):** `age_days = today − due_date`. If due_date is null, use submission_date. Computed in Asia/Riyadh calendar days; dates stored as DATE, timestamps as UTC.
- Aging bands:
  - `< 30` → green / normal
  - `30–59` → yellow / warning
  - `60–180` → orange / overdue
  - `> 180` → red / critical
- Alert thresholds are 30, 60 and 180 days (180 is the last alert). An invoice is still orange on day 180 and turns red on day 181; this follows the report literally.
- Aging is computed, not stored (one pure function used by API and job).

## 5. Module C — Contractor Safety Documents

- Contractor fields: name, contact_email, internal_manager (user FK), is_active.
- Document types (enum): `HIP`, `JSA`, `CCSP`, `CWQAP`, `JOB_X`.
- Document fields: contractor_id, doc_type, file_path, original_filename, expiry_date, uploaded_by, uploaded_at.
- Status per document (computed): `valid` if expiry_date ≥ today, else `expired`. Also `expiring_soon` when ≤ 30 days left.
- No contractor-level Pass/Fail; status is shown for each document only.
- Upload: PDF/JPG/PNG only, max 10 MB, stored on disk/volume (not in DB).

## 6. Notification Engine

- Runs daily via Celery Beat (separate worker, never in the request thread).
- Invoice job: for each invoice whose approval_status is `pending`, if age crosses 30, 60 or 180 → email the assigned engineer and their manager. Once an invoice is decided (approved or rejected), no further alerts are sent for it.
- Document job: if a document expires within 30 days → email the contractor contact and the internal manager.
- **Send once per threshold:** `notification_log` table with UNIQUE (entity_type, entity_id, threshold). Insert before/with send; skip if exists.
- Email failure: retry with backoff (3 attempts), log status `failed`, never crash the job; failed rows can be retried next run.
- Dev email goes to Mailpit (local SMTP + web UI).

## 7. Audit Log

- Table `audit_log`: user_id, action, entity_type, entity_id, old_values (JSON), new_values (JSON), created_at.
- Written for create/update/delete on SRs, invoices, contractors, documents, and role changes.

## 8. Database (MySQL 8)

Tables: `users`, `service_requests`, `invoices`, `contractors`, `contractor_documents`, `notification_log`, `audit_log`.
Full column and index design: see `docs/erd.md` (source of truth).

Indexes:

- `service_requests(assigned_engineer_id)`, `service_requests(requester_id)`, `service_requests(status)`, `service_requests(created_at)`
- `invoices(service_request_id)`, `invoices(approval_status, due_date)`
- `contractor_documents(contractor_id, doc_type)`, `contractor_documents(expiry_date)`
- UNIQUE `notification_log(entity_type, entity_id, threshold)`
- `audit_log(entity_type, entity_id)`, `audit_log(created_at)`
  .

## 9. Frontend

- Pages: Login, Dashboard, Service Requests (list + detail + create), Invoices, Contractors (list + detail with documents), Audit Log (manager/admin), Users (admin).
- Dashboard: counts by SR status, invoices per aging band (colored), documents expiring in 30 days, expired documents.
- Responsive down to mobile width.
- Bonus: WebSocket push so the dashboard updates when a new SR is created.

## 10. Deliverables

1. Git repository
2. ER diagram (`docs/erd.png`) + SQL dump (`docs/schema.sql`)
3. Swagger/OpenAPI at `/docs`
4. README with setup steps
5. Demo video: create SR → assign → add invoice and see aging color → upload document and see expiry alert
6. Bonus: unit tests (aging + notification triggers), Dockerfile + docker-compose.yml, WebSockets, audit log

## 11. Assumptions (document these in the README)

- Roles: `admin` added for user management (not in the report), so managers cannot grant themselves or others permissions.
- Admin can view all service requests (read-only). Admin cannot create or change them.
- Engineers add invoices to their assigned SRs; managers approve or reject them (the person who adds an invoice is never the one who approves it).
- Managers assign SRs to engineers and close SRs.
- Added `updated_at` on SRs (report only lists creation date/time).
- Added filter/sort by priority and pagination (report lists filtering by engineer, status, date).
- File upload limits (PDF/JPG/PNG, 10 MB) are a security choice, not from the report.
- Engineers move SRs to In Progress and Resolved.
- Operations users see only their own SRs.
- Requester is the logged-in user (not a free-text name).
- Each user may have a manager (`users.manager_id`); invoice alerts go to the assigned engineer and that manager.
- Added fields not in the report: SR title; invoice number, amount, approval status. All amounts are in SAR (no currency column).
- Aging basis: the report says "due date or submission date"; we use due date, falling back to submission date when due date is empty.
- Aging bands follow the report literally: day 180 is orange and the last alert; red starts on day 181.
- Invoice alerts and aging colors stop once an invoice is decided (approved or rejected).
- Document status is per document only (Valid / Expiring soon / Expired); there is no contractor-level Pass/Fail.
- Contractors are not system users; they only receive email alerts.
- Dates are calculated in the Asia/Riyadh timezone.
