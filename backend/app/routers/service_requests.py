from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import User
from app.schemas.service_request import SRListParams, SRPage
from app.services.service_requests import InvalidDateRange, list_requests

router = APIRouter(prefix="/service-requests", tags=["service-requests"])


@router.get("", response_model=SRPage)
def list_service_requests(
    params: Annotated[SRListParams, Query()],
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SRPage:
    try:
        return list_requests(db, user, params)
    except InvalidDateRange as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)
        ) from error
