from datetime import date

from sqlalchemy import ColumnElement, Row, Select, and_, asc, desc, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, aliased

from app.core.errors import BadRequest
from app.models import ApprovalStatus, Invoice, ServiceRequest, SRStatus, User, UserRole
from app.models.base import utcnow
from app.schemas.invoice import (
    InvoiceCreate,
    InvoiceListParams,
    InvoiceOut,
    InvoicePage,
    InvoiceSortField,
)
from app.schemas.service_request import SortOrder
from app.services.aging import AGING_STATUS, AgingBand, band_date_bounds, compute_aging
from app.services.audit import AuditAction, AuditEntity, audited_write, log_action, row_values
from app.services.dates import riyadh_today
from app.services.service_requests import lock_visible_request

MYSQL_DUPLICATE_ENTRY = 1062


class InvoiceNotFound(Exception):
    """The invoice does not exist, or this user is not allowed to see it."""


class DuplicateInvoiceNumber(Exception):
    """invoice_number is already used. app.main answers this with a 409."""


class InvoiceNotAllowed(BadRequest):
    """An invoice cannot be added to this request. The message is safe to show the client."""


class InvalidApprovalChange(BadRequest):
    """The invoice cannot be approved / rejected now. The message is safe to show the client."""


# The two outcomes of a decision and the audit action each one is logged as.
DECISION_ACTIONS = {
    ApprovalStatus.APPROVED: AuditAction.APPROVE,
    ApprovalStatus.REJECTED: AuditAction.REJECT,
}

# Aging runs on this date: the due date, or the submission date when there is none.
REFERENCE_DATE = func.coalesce(Invoice.due_date, Invoice.submission_date)


def band_conditions(today: date, band: AgingBand) -> ColumnElement[bool]:
    """SQL condition: the invoice's reference date falls in `band`. The edges come from
    aging.band_date_bounds, so the list filter and the dashboard counts share one rule."""
    earliest, latest = band_date_bounds(today, band)
    conditions = []
    if earliest is not None:
        conditions.append(REFERENCE_DATE >= earliest)
    if latest is not None:
        conditions.append(REFERENCE_DATE <= latest)
    return and_(*conditions)

SORT_COLUMNS = {
    InvoiceSortField.CREATED_AT: Invoice.created_at,
    InvoiceSortField.AMOUNT: Invoice.amount,
    # An older reference date means a higher age, so this one is flipped in _fetch_page.
    InvoiceSortField.AGE: REFERENCE_DATE,
}


# The roles that may see invoices at all; operations never does. The router and the dashboard
# both use this, so the rule cannot drift between them.
INVOICE_VIEWER_ROLES = (UserRole.ENGINEER, UserRole.MANAGER, UserRole.ADMIN)


def can_view_invoices(user: User) -> bool:
    return user.role in INVOICE_VIEWER_ROLES


def visibility_conditions(user: User) -> list[ColumnElement[bool]]:
    """Engineers see the invoices of requests assigned to them, managers and admins see
    all. A role not listed here raises instead of seeing all (operations never gets here:
    the router refuses it first)."""
    match user.role:
        case UserRole.ENGINEER:
            return [ServiceRequest.assigned_engineer_id == user.id]
        case UserRole.MANAGER | UserRole.ADMIN:
            return []
        case _:
            raise ValueError(f"No invoice visibility rule for role {user.role!r}")


def _filter_conditions(
    user: User, params: InvoiceListParams, today: date
) -> list[ColumnElement[bool]]:
    """Filters are added to the visibility rule, so they can only narrow what a user sees."""
    conditions = visibility_conditions(user)

    if params.approval_status is not None:
        conditions.append(Invoice.approval_status == params.approval_status)
    if params.service_request_id is not None:
        conditions.append(Invoice.service_request_id == params.service_request_id)
    if params.q:
        conditions.append(Invoice.invoice_number.contains(params.q, autoescape=True))
    if params.aging_band is not None:
        # Only invoices that age can be in a band (see aging.ages).
        conditions.append(Invoice.approval_status == AGING_STATUS)
        conditions.append(band_conditions(today, params.aging_band))

    return conditions


def _read_query() -> Select:
    """The SELECT behind every InvoiceOut: the invoice with the request title and the
    engineer's, creator's and approver's names joined in."""
    engineer = aliased(User)
    creator = aliased(User)
    approver = aliased(User)
    return (
        select(
            Invoice.id,
            Invoice.service_request_id,
            ServiceRequest.title.label("service_request_title"),
            engineer.full_name.label("assigned_engineer_name"),
            Invoice.invoice_number,
            Invoice.amount,
            Invoice.submission_date,
            Invoice.due_date,
            Invoice.approval_status,
            creator.full_name.label("created_by_name"),
            approver.full_name.label("approved_by_name"),
            Invoice.approved_at,
            Invoice.created_at,
            Invoice.updated_at,
        )
        .join(ServiceRequest, Invoice.service_request_id == ServiceRequest.id)
        .outerjoin(engineer, ServiceRequest.assigned_engineer_id == engineer.id)
        .join(creator, Invoice.created_by == creator.id)
        .outerjoin(approver, Invoice.approved_by == approver.id)
    )


def _to_out(row: Row, today: date) -> InvoiceOut:
    age_days, band = compute_aging(row.due_date, row.submission_date, today)
    return InvoiceOut.model_validate({**row._mapping, "age_days": age_days, "aging_band": band})


def _read_required(db: Session, *conditions: ColumnElement[bool]) -> InvoiceOut:
    """The one invoice matching `conditions`, or InvoiceNotFound."""
    row = db.execute(_read_query().where(*conditions)).one_or_none()
    if row is None:
        raise InvoiceNotFound()
    return _to_out(row, riyadh_today())


def get_invoice(db: Session, user: User, invoice_id: int) -> InvoiceOut:
    """One invoice, if this user may see it. Missing and hidden raise the same error."""
    return _read_required(db, Invoice.id == invoice_id, *visibility_conditions(user))


def create_invoice(db: Session, user: User, data: InvoiceCreate) -> InvoiceOut:
    """Adds a pending invoice to a request assigned to `user`, with its audit row."""
    with audited_write(db):
        # 404 for a missing request and for one assigned to someone else.
        request = lock_visible_request(db, user, data.service_request_id)
        if request.status == SRStatus.CLOSED:
            raise InvoiceNotAllowed("Invoices cannot be added to a closed request")

        if db.scalar(select(Invoice.id).where(Invoice.invoice_number == data.invoice_number)):
            raise DuplicateInvoiceNumber()

        invoice = Invoice(
            service_request_id=request.id,
            invoice_number=data.invoice_number,
            amount=data.amount,
            submission_date=data.submission_date,
            due_date=data.due_date,
            approval_status=ApprovalStatus.PENDING,
            created_by=user.id,
        )
        db.add(invoice)
        try:
            db.flush()
        except IntegrityError as error:
            # Two requests with the same number can both pass the check above; the
            # UNIQUE index decides.
            if error.orig is not None and error.orig.args[0] == MYSQL_DUPLICATE_ENTRY:
                raise DuplicateInvoiceNumber() from error
            raise

        log_action(
            db,
            user.id,
            AuditAction.CREATE,
            AuditEntity.INVOICE,
            invoice.id,
            new_values=row_values(invoice),
        )

    return _read_required(db, Invoice.id == invoice.id)


def decide_invoice(
    db: Session, user: User, invoice_id: int, decision: ApprovalStatus
) -> InvoiceOut:
    """Approves or rejects a pending invoice. The row is locked until the commit, so two
    managers cannot both decide the same invoice."""
    action = DECISION_ACTIONS[decision]

    with audited_write(db):
        invoice = db.scalars(
            select(Invoice)
            .where(Invoice.id == invoice_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        ).one_or_none()
        if invoice is None:
            raise InvoiceNotFound(invoice_id)
        if invoice.approval_status != ApprovalStatus.PENDING:
            raise InvalidApprovalChange("Only pending invoices can be approved or rejected")

        old_values = row_values(invoice)
        invoice.approval_status = decision
        invoice.approved_by = user.id
        invoice.approved_at = utcnow()

        log_action(
            db,
            user.id,
            action,
            AuditEntity.INVOICE,
            invoice.id,
            old_values=old_values,
            new_values=row_values(invoice),
        )

    return _read_required(db, Invoice.id == invoice_id)


def list_invoices(db: Session, user: User, params: InvoiceListParams) -> InvoicePage:
    """One page of the invoices this user may see. `total` counts every matching row."""
    today = riyadh_today()
    conditions = _filter_conditions(user, params, today)
    total = (
        db.scalar(
            select(func.count())
            .select_from(Invoice)
            .join(ServiceRequest, Invoice.service_request_id == ServiceRequest.id)
            .where(*conditions)
        )
        or 0
    )

    offset = (params.page - 1) * params.page_size
    items = [] if offset >= total else _fetch_page(db, conditions, params, offset, today)
    return InvoicePage(items=items, total=total, page=params.page, page_size=params.page_size)


def _fetch_page(
    db: Session,
    conditions: list[ColumnElement[bool]],
    params: InvoiceListParams,
    offset: int,
    today: date,
) -> list[InvoiceOut]:
    ascending = params.order == SortOrder.ASC
    # Sorting by age: a larger age is an earlier reference date, so the direction flips.
    if params.sort == InvoiceSortField.AGE:
        ascending = not ascending
    direction = asc if ascending else desc
    tie_direction = asc if params.order == SortOrder.ASC else desc

    query = (
        _read_query()
        .where(*conditions)
        .order_by(direction(SORT_COLUMNS[params.sort]), tie_direction(Invoice.id))
        .limit(params.page_size)
        .offset(offset)
    )
    return [_to_out(row, today) for row in db.execute(query).all()]
