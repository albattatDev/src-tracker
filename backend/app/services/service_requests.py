from sqlalchemy import select
from sqlalchemy.orm import Session, aliased

from app.models import ServiceRequest, User, UserRole
from app.schemas.service_request import SRRead


def list_requests(db: Session, user: User) -> list[SRRead]:
    """Returns the service requests this user may see, with names joined from users.

    Operations see the requests they made, engineers see the requests assigned to them,
    managers and admins see all. A role not listed here raises instead of seeing all.
    """
    requester = aliased(User)
    engineer = aliased(User)

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
    )

    match user.role:
        case UserRole.OPERATIONS:
            query = query.where(ServiceRequest.requester_id == user.id)
        case UserRole.ENGINEER:
            query = query.where(ServiceRequest.assigned_engineer_id == user.id)
        case UserRole.MANAGER | UserRole.ADMIN:
            pass
        case _:
            raise ValueError(f"No service request visibility rule for role {user.role!r}")

    return [SRRead.model_validate(row) for row in db.execute(query).all()]
