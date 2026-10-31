import enum
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, db_enum, table_args, utcnow


class DocType(str, enum.Enum):
    HIP = "HIP"
    JSA = "JSA"
    CCSP = "CCSP"
    CWQAP = "CWQAP"
    JOB_X = "JOB_X"


class ContractorDocument(Base):
    __tablename__ = "contractor_documents"
    __table_args__ = table_args(
        Index(
            "ix_contractor_documents_contractor_id_doc_type",
            "contractor_id",
            "doc_type",
        ),
        Index("ix_contractor_documents_expiry_date", "expiry_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    contractor_id: Mapped[int] = mapped_column(
        ForeignKey("contractors.id"), nullable=False
    )
    doc_type: Mapped[DocType] = mapped_column(db_enum(DocType), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    expiry_date: Mapped[date] = mapped_column(Date, nullable=False)
    uploaded_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=utcnow
    )
