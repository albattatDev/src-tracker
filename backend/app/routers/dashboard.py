from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import User
from app.schemas.dashboard import DashboardOut
from app.services.dashboard import get_dashboard

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


# Read-only and open to every role: the service decides what each role gets.
@router.get("", response_model=DashboardOut)
def read_dashboard(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> DashboardOut:
    return get_dashboard(db, user)
