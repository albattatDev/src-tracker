from typing import Literal

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_role
from app.models import User, UserRole
from app.schemas.user import UserBrief
from app.services.users import list_active_users

router = APIRouter(prefix="/users", tags=["users"])


@router.get(
    "",
    response_model=list[UserBrief],
    dependencies=[Depends(require_role(UserRole.MANAGER, UserRole.ADMIN))],
)
def list_users(
    # Only the roles a picker needs: engineers (assign an SR) and managers (a contractor's
    # internal manager). Any other value is rejected with 422 instead of exposing other roles.
    role: Literal[UserRole.ENGINEER, UserRole.MANAGER],
    db: Session = Depends(get_db),
) -> list[User]:
    return list_active_users(db, role)
