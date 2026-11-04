"""Demo helper: run both daily scans right now instead of waiting for 06:00 Riyadh.
The scans only claim and enqueue; the worker container does the sending.

    docker compose exec api python -m app.tasks.run_now
"""

from app.core.database import SessionLocal
from app.tasks.document_jobs import scan_documents
from app.tasks.invoice_jobs import scan_invoices


def _line(name: str, result) -> str:
    return (
        f"{name}: claimed {result.claimed}, enqueued {result.enqueued}, "
        f"no recipients {result.no_recipients}, errors {result.errors}"
    )


if __name__ == "__main__":
    with SessionLocal() as session:
        print(_line("invoices", scan_invoices(session)))
        print(_line("documents", scan_documents(session)))
    print("The worker sends the emails: see http://localhost:8025")
