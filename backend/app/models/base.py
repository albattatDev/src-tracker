import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


def utcnow() -> datetime:
    """Current time in UTC, stored naive (the column itself carries no tz info,
    but every value written through this helper is UTC by convention — see
    CLAUDE.md: 'Store timestamps in UTC')."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def table_args(*indexes_and_constraints):
    """`__table_args__` for every table: the given indexes/constraints plus the
    one place where the InnoDB / utf8mb4 options are set."""
    return (*indexes_and_constraints, {"mysql_engine": "InnoDB", "mysql_charset": "utf8mb4"})


def db_enum(enum_cls: type[enum.Enum]) -> Enum:
    """Stores the enum's values (e.g. 'in_progress'), not its member names."""
    return Enum(enum_cls, values_callable=lambda members: [m.value for m in members])


class CreatedAtMixin:
    # sort_order keeps the timestamps last in the table, after the model's own columns.
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=utcnow, sort_order=100
    )


class TimestampMixin(CreatedAtMixin):
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=utcnow, onupdate=utcnow, sort_order=101
    )
