from sqlalchemy import Boolean, ForeignKey, String, true
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, table_args


class Contractor(TimestampMixin, Base):
    __tablename__ = "contractors"
    __table_args__ = table_args()

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    contact_email: Mapped[str] = mapped_column(String(255), nullable=False)
    internal_manager_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=true()
    )
