from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_role
from app.models import User, UserRole
from app.schemas.audit import AuditListParams, AuditLogPage, AuditUser
from app.services.audit_log import list_audit_log, list_audit_users

router = APIRouter(prefix="/audit-log", tags=["audit"])

# Read-only, so nothing here writes to the audit log. A bad date range becomes a 400 in the
# BadRequest handler registered in app.main.
VIEWERS = (UserRole.MANAGER, UserRole.ADMIN)


@router.get("", response_model=AuditLogPage)
def list_entries(
    params: Annotated[AuditListParams, Query()],
    user: User = Depends(require_role(*VIEWERS)),
    db: Session = Depends(get_db),
) -> AuditLogPage:
    return list_audit_log(db, params)


@router.get("/users", response_model=list[AuditUser])
def list_actors(
    user: User = Depends(require_role(*VIEWERS)),
    db: Session = Depends(get_db),
) -> list[AuditUser]:
    return list_audit_users(db)
