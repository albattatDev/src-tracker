from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models import User, UserRole
from app.schemas.service_request import (
    SRAssign,
    SRCreate,
    SRListParams,
    SRPage,
    SRRead,
    SRStatusUpdate,
)
from app.services.service_requests import (
    assign_request,
    change_status,
    create_request,
    get_request,
    list_requests,
)

# The service errors (not found, invalid date range / status change / engineer, status
# change not allowed) are turned into 4xx answers by the handlers registered in app.main,
# so the routes below only call the service.
router = APIRouter(prefix="/service-requests", tags=["service-requests"])


@router.get("", response_model=SRPage)
def list_service_requests(
    params: Annotated[SRListParams, Query()],
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SRPage:
    return list_requests(db, user, params)


@router.post("", response_model=SRRead, status_code=status.HTTP_201_CREATED)
def create_service_request(
    data: SRCreate,
    user: User = Depends(require_role(UserRole.OPERATIONS, UserRole.MANAGER)),
    db: Session = Depends(get_db),
) -> SRRead:
    return create_request(db, user, data)


@router.patch("/{request_id}/assign", response_model=SRRead)
def assign_service_request(
    request_id: int,
    data: SRAssign,
    user: User = Depends(require_role(UserRole.MANAGER)),
    db: Session = Depends(get_db),
) -> SRRead:
    return assign_request(db, user, request_id, data)


@router.patch("/{request_id}/status", response_model=SRRead)
def change_service_request_status(
    request_id: int,
    data: SRStatusUpdate,
    user: User = Depends(require_role(UserRole.ENGINEER, UserRole.MANAGER)),
    db: Session = Depends(get_db),
) -> SRRead:
    return change_status(db, user, request_id, data)


@router.get("/{request_id}", response_model=SRRead)
def get_service_request(
    request_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SRRead:
    return get_request(db, user, request_id)
