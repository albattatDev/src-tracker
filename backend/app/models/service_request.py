import enum

from sqlalchemy import ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, db_enum, table_args


class Priority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class SRStatus(str, enum.Enum):
    OPEN = "open"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class ServiceRequest(TimestampMixin, Base):
    __tablename__ = "service_requests"
    __table_args__ = table_args(
        Index("ix_service_requests_assigned_engineer_id", "assigned_engineer_id"),
        Index("ix_service_requests_requester_id", "requester_id"),
        Index("ix_service_requests_status", "status"),
        Index("ix_service_requests_created_at", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[Priority] = mapped_column(db_enum(Priority), nullable=False)
    status: Mapped[SRStatus] = mapped_column(
        db_enum(SRStatus),
        nullable=False,
        default=SRStatus.OPEN,
        server_default=SRStatus.OPEN.value,
    )
    requester_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False
    )
    assigned_engineer_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
