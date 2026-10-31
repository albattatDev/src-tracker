import enum
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import DECIMAL, Date, DateTime, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, db_enum, table_args


class ApprovalStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class Invoice(TimestampMixin, Base):
    __tablename__ = "invoices"
    __table_args__ = table_args(
        Index("ix_invoices_service_request_id", "service_request_id"),
        Index("ix_invoices_approval_status_due_date", "approval_status", "due_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    service_request_id: Mapped[int] = mapped_column(
        ForeignKey("service_requests.id"), nullable=False
    )
    invoice_number: Mapped[str] = mapped_column(
        String(50), nullable=False, unique=True
    )
    amount: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False)
    submission_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    approval_status: Mapped[ApprovalStatus] = mapped_column(
        db_enum(ApprovalStatus),
        nullable=False,
        default=ApprovalStatus.PENDING,
        server_default=ApprovalStatus.PENDING.value,
    )
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    approved_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
