from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import User
from app.schemas.service_request import SRRead
from app.services.service_requests import list_requests

router = APIRouter(prefix="/service-requests", tags=["service-requests"])


@router.get("", response_model=list[SRRead])
def list_service_requests(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[SRRead]:
    return list_requests(db, user)
