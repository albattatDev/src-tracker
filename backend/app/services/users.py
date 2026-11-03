from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import User, UserRole


def list_active_users(db: Session, role: UserRole) -> list[User]:
    """Active users with this role, sorted by name (id breaks ties so the order is stable)."""
    query = (
        select(User)
        .where(User.role == role, User.is_active.is_(True))
        .order_by(User.first_name, User.last_name, User.id)
    )
    return list(db.scalars(query))
