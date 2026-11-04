"""User queries and the admin's user management."""

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, aliased

from app.core.errors import FieldError
from app.core.security import hash_password
from app.models import User, UserRole
from app.schemas.user import UserAdminOut, UserCreate, UserUpdate
from app.services.audit import AuditAction, AuditEntity, audited_write, log_action, row_values
from app.services.service_requests import count_in_progress_for_engineer


class UserNotFound(Exception):
    pass


class DuplicateEmail(FieldError):
    status_code = 409

    def __init__(self) -> None:
        super().__init__("email", "A user with this email already exists")


class SelfDeactivation(FieldError):
    status_code = 409

    def __init__(self) -> None:
        super().__init__("is_active", "You cannot deactivate your own account")


class LastActiveAdmin(FieldError):
    status_code = 409

    def __init__(self) -> None:
        super().__init__("is_active", "At least one active admin is required")


class EngineerHasRequestsInProgress(FieldError):
    status_code = 409

    def __init__(self, count: int) -> None:
        noun = "request" if count == 1 else "requests"
        super().__init__(
            "is_active",
            f"This engineer has {count} {noun} in progress. They must be resolved first.",
        )


class InvalidManager(FieldError):
    status_code = 400


def list_active_users(db: Session, role: UserRole) -> list[User]:
    """Active users with this role, sorted by name (id breaks ties so the order is stable)."""
    query = (
        select(User)
        .where(User.role == role, User.is_active.is_(True))
        .order_by(User.first_name, User.last_name, User.id)
    )
    return list(db.scalars(query))


# ---------------------------------------------------------------- admin: read


def _admin_query():
    manager = aliased(User)
    return select(User, manager.full_name).outerjoin(manager, User.manager_id == manager.id)


def _admin_out(user: User, manager_name: str | None) -> UserAdminOut:
    return UserAdminOut(
        id=user.id,
        first_name=user.first_name,
        last_name=user.last_name,
        full_name=user.full_name,
        email=user.email,
        role=user.role,
        manager_id=user.manager_id,
        manager_name=manager_name,
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


def list_users_admin(db: Session) -> list[UserAdminOut]:
    """Every user, active or not, sorted by name."""
    rows = db.execute(_admin_query().order_by(User.first_name, User.last_name, User.id)).all()
    return [_admin_out(user, manager_name) for user, manager_name in rows]


def _get_admin_out(db: Session, user_id: int) -> UserAdminOut:
    row = db.execute(_admin_query().where(User.id == user_id)).one()
    return _admin_out(row[0], row[1])


# ---------------------------------------------------------------- admin: write


def _require_valid_manager(db: Session, manager_id: int, user_id: int | None) -> None:
    if manager_id == user_id:
        raise InvalidManager("manager_id", "A user cannot be their own manager")
    active = db.scalar(select(User.id).where(User.id == manager_id, User.is_active.is_(True)))
    if active is None:
        raise InvalidManager("manager_id", "Manager must be an active user")


def create_user(db: Session, actor: User, data: UserCreate) -> UserAdminOut:
    with audited_write(db):
        if db.scalar(select(User.id).where(func.lower(User.email) == data.email)) is not None:
            raise DuplicateEmail()
        if data.manager_id is not None:
            _require_valid_manager(db, data.manager_id, None)

        user = User(
            first_name=data.first_name,
            last_name=data.last_name,
            email=data.email,
            role=data.role,
            manager_id=data.manager_id,
            password_hash=hash_password(data.password),
            is_active=True,
        )
        db.add(user)
        try:
            db.flush()
        except IntegrityError:  # two requests with the same email at once
            raise DuplicateEmail()
        log_action(
            db,
            actor.id,
            AuditAction.CREATE,
            AuditEntity.USER,
            user.id,
            new_values=row_values(user),
        )
    return _get_admin_out(db, user.id)


def _require_not_last_admin(db: Session, target: User) -> None:
    """Deactivating this admin must leave another active admin. The active admins are
    locked while counting, so two admins deactivating each other at once cannot both pass."""
    other_admins = db.scalars(
        select(User.id)
        .where(User.role == UserRole.ADMIN, User.is_active.is_(True), User.id != target.id)
        .order_by(User.id)  # same lock order for every caller
        .with_for_update()
    ).all()
    if not other_admins:
        raise LastActiveAdmin()


def _require_no_requests_in_progress(db: Session, engineer: User) -> None:
    """Only in_progress blocks: an assigned request can still be reassigned by a manager."""
    in_progress = count_in_progress_for_engineer(db, engineer.id)
    if in_progress:
        raise EngineerHasRequestsInProgress(in_progress)


def update_user(db: Session, actor: User, user_id: int, data: UserUpdate) -> UserAdminOut:
    """Applies only the fields that were sent. The row is locked until the commit. No audit
    row is written when nothing actually changed."""
    changes = data.model_dump(exclude_unset=True)

    with audited_write(db):
        user = db.scalar(select(User).where(User.id == user_id).with_for_update())
        if user is None:
            raise UserNotFound()

        if changes.get("is_active") is False and user.is_active:
            if user.id == actor.id:
                raise SelfDeactivation()
            if user.role == UserRole.ADMIN:
                _require_not_last_admin(db, user)
            if user.role == UserRole.ENGINEER:
                _require_no_requests_in_progress(db, user)

        if changes.get("manager_id") is not None and changes["manager_id"] != user.manager_id:
            _require_valid_manager(db, changes["manager_id"], user.id)

        old_values = row_values(user)
        for field, value in changes.items():
            setattr(user, field, value)
        new_values = row_values(user)

        if new_values != old_values:
            log_action(
                db,
                actor.id,
                AuditAction.UPDATE,
                AuditEntity.USER,
                user.id,
                old_values=old_values,
                new_values=new_values,
            )
    return _get_admin_out(db, user_id)
