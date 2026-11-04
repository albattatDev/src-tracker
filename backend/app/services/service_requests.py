from datetime import timedelta
from typing import Any

from sqlalchemy import ColumnElement, Select, asc, desc, func, select
from sqlalchemy.orm import Session, aliased

from app.core.errors import BadRequest
from app.models import ServiceRequest, SRStatus, User, UserRole
from app.schemas.service_request import (
    SortOrder,
    SRAssign,
    SRCreate,
    SRListParams,
    SRPage,
    SRRead,
    SRSortField,
    SRStatusUpdate,
)
from app.services.audit import AuditAction, AuditEntity, audited_write, log_action, row_values
from app.services.dates import riyadh_day_start_utc
from app.services.sr_status import (
    InvalidStatusChange,
    can_assign,
    check_role_can_set,
    check_status_change,
)

# The only columns a client can sort by. The client picks a key, never a column name.
# Sorting by priority relies on the MySQL ENUM order (low, medium, high); don't reorder it.
SORT_COLUMNS = {
    SRSortField.CREATED_AT: ServiceRequest.created_at,
    SRSortField.PRIORITY: ServiceRequest.priority,
}


class InvalidDateRange(BadRequest):
    """created_from / created_to cannot be used. The message is safe to show the client."""


class ServiceRequestNotFound(Exception):
    """The request does not exist, or this user is not allowed to see it."""


class InvalidEngineer(BadRequest):
    """The chosen user cannot be assigned. The message is safe to show the client."""


def visibility_conditions(user: User) -> list[ColumnElement[bool]]:
    """Operations see the requests they made, engineers see the requests assigned to them,
    managers and admins see all. A role not listed here raises instead of seeing all.
    """
    match user.role:
        case UserRole.OPERATIONS:
            return [ServiceRequest.requester_id == user.id]
        case UserRole.ENGINEER:
            return [ServiceRequest.assigned_engineer_id == user.id]
        case UserRole.MANAGER | UserRole.ADMIN:
            return []
        case _:
            raise ValueError(f"No service request visibility rule for role {user.role!r}")


def _check_date_range(params: SRListParams) -> None:
    if (
        params.created_from is not None
        and params.created_to is not None
        and params.created_from > params.created_to
    ):
        raise InvalidDateRange("created_from must not be after created_to")


def _date_conditions(params: SRListParams) -> list[ColumnElement[bool]]:
    """Turns the Riyadh created_from / created_to dates into UTC conditions on created_at."""
    _check_date_range(params)

    conditions = []
    if params.created_from is not None:
        try:
            start = riyadh_day_start_utc(params.created_from)
        except OverflowError as error:
            raise InvalidDateRange("created_from is out of range") from error
        conditions.append(ServiceRequest.created_at >= start)
    if params.created_to is not None:
        try:
            # created_to is inclusive, so the cut-off is the start of the day after it.
            next_day_start = riyadh_day_start_utc(params.created_to + timedelta(days=1))
        except OverflowError as error:
            raise InvalidDateRange("created_to is out of range") from error
        conditions.append(ServiceRequest.created_at < next_day_start)
    return conditions


def _filter_conditions(user: User, params: SRListParams) -> list[ColumnElement[bool]]:
    """Filters are added to the visibility rule, so they can only narrow what a user sees."""
    conditions = visibility_conditions(user)
    conditions += _date_conditions(params)

    if params.status is not None:
        conditions.append(ServiceRequest.status == params.status)
    if params.priority is not None:
        conditions.append(ServiceRequest.priority == params.priority)
    # An engineer's list is always their own, so their assigned_engineer_id is ignored.
    if params.assigned_engineer_id is not None and user.role != UserRole.ENGINEER:
        conditions.append(ServiceRequest.assigned_engineer_id == params.assigned_engineer_id)

    return conditions


def _read_query() -> Select:
    """The SELECT behind every SRRead (list, detail, create): a service request with the
    requester's and engineer's names joined in from users."""
    requester = aliased(User)
    engineer = aliased(User)
    return (
        select(
            ServiceRequest.id,
            ServiceRequest.title,
            ServiceRequest.description,
            ServiceRequest.priority,
            ServiceRequest.status,
            requester.full_name.label("requester_name"),
            # NULL when the outer join finds no engineer (CONCAT is NULL if any part is).
            engineer.full_name.label("assigned_engineer_name"),
            ServiceRequest.created_at,
            ServiceRequest.updated_at,
        )
        .join(requester, ServiceRequest.requester_id == requester.id)
        .outerjoin(engineer, ServiceRequest.assigned_engineer_id == engineer.id)
    )


def _read_required(db: Session, *conditions: ColumnElement[bool]) -> SRRead:
    """The one request matching `conditions`, or ServiceRequestNotFound."""
    row = db.execute(_read_query().where(*conditions)).one_or_none()
    if row is None:
        raise ServiceRequestNotFound()
    return SRRead.model_validate(row)


def lock_visible_request(db: Session, user: User, request_id: int) -> ServiceRequest:
    """The request as a row this user may see, locked until the commit so two people
    changing the same request cannot both pass their checks on the same old status.
    Missing and hidden requests raise the same error as in get_request."""
    request = db.scalars(
        select(ServiceRequest)
        .where(ServiceRequest.id == request_id, *visibility_conditions(user))
        .with_for_update()
        .execution_options(populate_existing=True)
    ).one_or_none()
    if request is None:
        raise ServiceRequestNotFound(request_id)
    return request


def _log_change(
    db: Session,
    user: User,
    action: AuditAction,
    request: ServiceRequest,
    old_values: dict[str, Any],
) -> None:
    """Audits a change to `request`; call it after the change, with old_values taken before."""
    log_action(
        db,
        user.id,
        action,
        AuditEntity.SERVICE_REQUEST,
        request.id,
        old_values=old_values,
        new_values=row_values(request),
    )


def get_request(db: Session, user: User, request_id: int) -> SRRead:
    """One request, if this user may see it. A missing request and one outside the user's
    visibility raise the same error, so the API never reveals which ids exist."""
    return _read_required(db, ServiceRequest.id == request_id, *visibility_conditions(user))


def create_request(db: Session, user: User, data: SRCreate) -> SRRead:
    """Creates an open request for `user` and its audit row in one transaction."""
    with audited_write(db):
        request = ServiceRequest(
            title=data.title,
            description=data.description,
            priority=data.priority,
            status=SRStatus.OPEN,
            requester_id=user.id,
        )
        db.add(request)
        # flush sends the INSERT so MySQL gives us request.id, but nothing is saved for
        # good until the commit at the end of the with block.
        db.flush()

        log_action(
            db,
            user.id,
            AuditAction.CREATE,
            AuditEntity.SERVICE_REQUEST,
            request.id,
            new_values=row_values(request),
        )

    # The caller just created this row, so it is read back without the visibility rule:
    # creating must not depend on being allowed to see.
    return _read_required(db, ServiceRequest.id == request.id)


def assign_request(db: Session, user: User, request_id: int, data: SRAssign) -> SRRead:
    """Gives an open or assigned request to an engineer. From open the status becomes
    assigned; from assigned only the engineer changes."""
    with audited_write(db):
        request = lock_visible_request(db, user, request_id)
        old_values = row_values(request)

        if not can_assign(request.status):
            raise InvalidStatusChange("Only open or assigned requests can be assigned")

        # This engineer row is not locked: one deactivated between this check and the
        # commit can still be assigned. The window is tiny, so it is accepted.
        engineer = db.get(User, data.assigned_engineer_id)
        # One message for missing, wrong role and inactive, so ids and roles are not leaked.
        if engineer is None or engineer.role != UserRole.ENGINEER or not engineer.is_active:
            raise InvalidEngineer("assigned_engineer_id must be an active engineer")

        request.assigned_engineer_id = engineer.id
        request.status = SRStatus.ASSIGNED
        _log_change(db, user, AuditAction.ASSIGN, request, old_values)

    return _read_required(db, ServiceRequest.id == request_id)


def change_status(db: Session, user: User, request_id: int, data: SRStatusUpdate) -> SRRead:
    """Moves a request one step along the lifecycle (never to assigned, see sr_status)."""
    with audited_write(db):
        request = lock_visible_request(db, user, request_id)
        old_values = row_values(request)

        check_role_can_set(user.role, data.status)
        check_status_change(request.status, data.status)

        request.status = data.status
        _log_change(db, user, AuditAction.UPDATE, request, old_values)

    return _read_required(db, ServiceRequest.id == request_id)


def list_requests(db: Session, user: User, params: SRListParams) -> SRPage:
    """Returns one page of the service requests this user may see, with names joined
    from users. `total` counts every matching row, not just this page.
    """
    conditions = _filter_conditions(user, params)
    total = db.scalar(select(func.count()).select_from(ServiceRequest).where(*conditions)) or 0

    # Past the end there is nothing to fetch. Skipping the query also keeps an enormous
    # page number from reaching MySQL as an OFFSET it would reject.
    offset = (params.page - 1) * params.page_size
    items = [] if offset >= total else _fetch_page(db, conditions, params, offset)

    return SRPage(items=items, total=total, page=params.page, page_size=params.page_size)


def _fetch_page(
    db: Session,
    conditions: list[ColumnElement[bool]],
    params: SRListParams,
    offset: int,
) -> list[SRRead]:
    direction = asc if params.order == SortOrder.ASC else desc

    query = (
        _read_query()
        .where(*conditions)
        # id breaks ties, so rows with equal values cannot swap places between pages.
        .order_by(direction(SORT_COLUMNS[params.sort]), direction(ServiceRequest.id))
        .limit(params.page_size)
        .offset(offset)
    )

    return [SRRead.model_validate(row) for row in db.execute(query).all()]
