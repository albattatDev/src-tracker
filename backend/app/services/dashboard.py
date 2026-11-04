"""Dashboard counts. SR and invoice counts are SQL COUNT / GROUP BY; document counts reuse
current_documents() and document_status(), exactly like the daily expiry job."""

from datetime import date

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models import Invoice, ServiceRequest, SRStatus, User, UserRole
from app.schemas.dashboard import DashboardOut, DocumentCounts
from app.services import invoices, service_requests
from app.services.aging import AGING_STATUS, AgingBand
from app.services.compliance import DocumentStatus, document_status
from app.services.contractor_documents import current_documents
from app.services.dates import riyadh_today

# Only these roles see document counts.
DOCUMENT_ROLES = (UserRole.MANAGER, UserRole.ADMIN)


def _sr_counts(db: Session, user: User) -> dict[SRStatus, int]:
    rows = db.execute(
        select(ServiceRequest.status, func.count())
        .where(*service_requests.visibility_conditions(user))
        .group_by(ServiceRequest.status)
    )
    counts = {status: 0 for status in SRStatus}
    counts.update({status: count for status, count in rows})
    return counts


def _band_case(today: date):
    """One CASE that labels each invoice with its band (see invoices.band_conditions)."""
    return case(*((invoices.band_conditions(today, band), band.value) for band in AgingBand))


def _invoice_counts(db: Session, user: User, today: date) -> dict[AgingBand, int] | None:
    if not invoices.can_view_invoices(user):
        return None
    band = _band_case(today).label("band")
    rows = db.execute(
        select(band, func.count())
        .select_from(Invoice)
        .join(ServiceRequest, Invoice.service_request_id == ServiceRequest.id)
        .where(Invoice.approval_status == AGING_STATUS, *invoices.visibility_conditions(user))
        .group_by(band)
    )
    counts = {band: 0 for band in AgingBand}
    counts.update({AgingBand(value): count for value, count in rows})
    return counts


def _document_counts(db: Session, user: User, today: date) -> DocumentCounts | None:
    if user.role not in DOCUMENT_ROLES:
        return None
    expiring = expired = 0
    for document in current_documents(db, active_only=True):
        status = document_status(document.expiry_date, today)
        expiring += status == DocumentStatus.EXPIRING_SOON
        expired += status == DocumentStatus.EXPIRED
    return DocumentCounts(expiring_soon=expiring, expired=expired)


def get_dashboard(db: Session, user: User) -> DashboardOut:
    today = riyadh_today()
    return DashboardOut(
        sr_by_status=_sr_counts(db, user),
        invoices_by_band=_invoice_counts(db, user, today),
        documents=_document_counts(db, user, today),
    )
