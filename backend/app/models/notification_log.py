import enum
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, CreatedAtMixin, db_enum, table_args


class NotificationEntityType(str, enum.Enum):
    INVOICE = "invoice"
    DOCUMENT = "document"


class NotificationStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"


class NotificationLog(CreatedAtMixin, Base):
    __tablename__ = "notification_log"
    __table_args__ = table_args(
        UniqueConstraint(
            "entity_type", "entity_id", "threshold", name="uq_notification_log_entity_threshold"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    entity_type: Mapped[NotificationEntityType] = mapped_column(
        db_enum(NotificationEntityType), nullable=False
    )
    # No FK: this id points into either `invoices` or `contractor_documents`
    # depending on entity_type, so it cannot reference a single table.
    entity_id: Mapped[int] = mapped_column(Integer, nullable=False)
    threshold: Mapped[int] = mapped_column(Integer, nullable=False)
    recipients: Mapped[str] = mapped_column(String(1000), nullable=False)
    status: Mapped[NotificationStatus] = mapped_column(
        db_enum(NotificationStatus), nullable=False
    )
    attempts: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
