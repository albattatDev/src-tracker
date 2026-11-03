from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models import User, UserRole
from app.schemas.service_request import SRCreate, SRListParams, SRPage, SRRead
from app.services.service_requests import create_request, get_request, list_requests

# ServiceRequestNotFound and InvalidDateRange are turned into 404 / 400 by the handlers
# registered in app.main, so the routes below only call the service.
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


@router.get("/{request_id}", response_model=SRRead)
def get_service_request(
    request_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SRRead:
    return get_request(db, user, request_id)
