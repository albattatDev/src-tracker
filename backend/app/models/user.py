import enum

from sqlalchemy import Boolean, ColumnElement, ForeignKey, String, func, true
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, db_enum, table_args


class UserRole(str, enum.Enum):
    OPERATIONS = "operations"
    ENGINEER = "engineer"
    MANAGER = "manager"
    ADMIN = "admin"


class User(TimestampMixin, Base):
    __tablename__ = "users"
    __table_args__ = table_args()

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    first_name: Mapped[str] = mapped_column(String(75), nullable=False)
    last_name: Mapped[str] = mapped_column(String(75), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(db_enum(UserRole), nullable=False)
    manager_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=true()
    )

    manager: Mapped["User | None"] = relationship(
        "User", remote_side="User.id", back_populates="reports"
    )
    reports: Mapped[list["User"]] = relationship("User", back_populates="manager")

    @hybrid_property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    @full_name.inplace.expression
    @classmethod
    def _full_name_expression(cls) -> ColumnElement[str]:
        # Also works on aliased(User), which is how a query joins users twice.
        return func.concat(cls.first_name, " ", cls.last_name)
