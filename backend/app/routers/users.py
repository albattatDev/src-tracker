from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_role
from app.models import User, UserRole
from app.schemas.user import UserAdminOut, UserBrief, UserCreate, UserUpdate
from app.services.users import create_user, list_active_users, list_users_admin, update_user

router = APIRouter(prefix="/users", tags=["users"])

# Not-found, duplicate email, self-deactivation, last admin and bad manager become 4xx
# answers in the handlers registered in app.main.


@router.get("", response_model=list[UserAdminOut] | list[UserBrief])
def list_users(
    # With a role: the picker list (engineers to assign an SR to, managers for a contractor),
    # open to managers and admins. Any other value is rejected with 422.
    # Without a role: the full user list for the Users page, admin only.
    role: Literal[UserRole.ENGINEER, UserRole.MANAGER] | None = None,
    user: User = Depends(require_role(UserRole.MANAGER, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> list[User] | list[UserAdminOut]:
    if role is not None:
        return list_active_users(db, role)
    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to do this",
        )
    return list_users_admin(db)


@router.post("", response_model=UserAdminOut, status_code=status.HTTP_201_CREATED)
def create_new_user(
    data: UserCreate,
    admin: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> UserAdminOut:
    return create_user(db, admin, data)


@router.patch("/{user_id}", response_model=UserAdminOut)
def patch_user(
    user_id: int,
    data: UserUpdate,
    admin: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> UserAdminOut:
    return update_user(db, admin, user_id, data)
