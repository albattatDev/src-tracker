from datetime import timedelta

from sqlalchemy import ColumnElement, asc, desc, func, select
from sqlalchemy.orm import Session, aliased

from app.models import ServiceRequest, User, UserRole
from app.schemas.service_request import (
    SortOrder,
    SRListParams,
    SRPage,
    SRRead,
    SRSortField,
)
from app.services.dates import riyadh_day_start_utc

# The only columns a client can sort by. The client picks a key, never a column name.
# Sorting by priority relies on the MySQL ENUM order (low, medium, high); don't reorder it.
SORT_COLUMNS = {
    SRSortField.CREATED_AT: ServiceRequest.created_at,
    SRSortField.PRIORITY: ServiceRequest.priority,
}


class InvalidDateRange(Exception):
    """created_from / created_to cannot be used. The message is safe to show the client."""


def _visibility_conditions(user: User) -> list[ColumnElement[bool]]:
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
    conditions = _visibility_conditions(user)
    conditions += _date_conditions(params)

    if params.status is not None:
        conditions.append(ServiceRequest.status == params.status)
    if params.priority is not None:
        conditions.append(ServiceRequest.priority == params.priority)
    # An engineer's list is always their own, so their assigned_engineer_id is ignored.
    if params.assigned_engineer_id is not None and user.role != UserRole.ENGINEER:
        conditions.append(ServiceRequest.assigned_engineer_id == params.assigned_engineer_id)

    return conditions


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
    requester = aliased(User)
    engineer = aliased(User)
    direction = asc if params.order == SortOrder.ASC else desc

    query = (
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
        .where(*conditions)
        # id breaks ties, so rows with equal values cannot swap places between pages.
        .order_by(direction(SORT_COLUMNS[params.sort]), direction(ServiceRequest.id))
        .limit(params.page_size)
        .offset(offset)
    )

    return [SRRead.model_validate(row) for row in db.execute(query).all()]
