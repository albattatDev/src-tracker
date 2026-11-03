from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_role
from app.models import ApprovalStatus, User, UserRole
from app.schemas.invoice import InvoiceCreate, InvoiceListParams, InvoiceOut, InvoicePage
from app.services.invoices import create_invoice, decide_invoice, get_invoice, list_invoices

# Service errors (not found, duplicate number, not allowed, invalid approval change) become
# 4xx answers in the handlers registered in app.main.
router = APIRouter(prefix="/invoices", tags=["invoices"])

# Operations never sees invoices.
VIEWERS = (UserRole.ENGINEER, UserRole.MANAGER, UserRole.ADMIN)


@router.get("", response_model=InvoicePage)
def list_all_invoices(
    params: Annotated[InvoiceListParams, Query()],
    user: User = Depends(require_role(*VIEWERS)),
    db: Session = Depends(get_db),
) -> InvoicePage:
    return list_invoices(db, user, params)


@router.post("", response_model=InvoiceOut, status_code=status.HTTP_201_CREATED)
def create_new_invoice(
    data: InvoiceCreate,
    user: User = Depends(require_role(UserRole.ENGINEER)),
    db: Session = Depends(get_db),
) -> InvoiceOut:
    return create_invoice(db, user, data)


@router.get("/{invoice_id}", response_model=InvoiceOut)
def get_one_invoice(
    invoice_id: int,
    user: User = Depends(require_role(*VIEWERS)),
    db: Session = Depends(get_db),
) -> InvoiceOut:
    return get_invoice(db, user, invoice_id)


@router.post("/{invoice_id}/approve", response_model=InvoiceOut)
def approve_invoice(
    invoice_id: int,
    user: User = Depends(require_role(UserRole.MANAGER)),
    db: Session = Depends(get_db),
) -> InvoiceOut:
    return decide_invoice(db, user, invoice_id, ApprovalStatus.APPROVED)


@router.post("/{invoice_id}/reject", response_model=InvoiceOut)
def reject_invoice(
    invoice_id: int,
    user: User = Depends(require_role(UserRole.MANAGER)),
    db: Session = Depends(get_db),
) -> InvoiceOut:
    return decide_invoice(db, user, invoice_id, ApprovalStatus.REJECTED)
