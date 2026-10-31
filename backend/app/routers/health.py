import logging

from fastapi import APIRouter, Depends, Response
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.health import HealthResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health(response: Response, db: Session = Depends(get_db)) -> HealthResponse:
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError:
        # Full error goes to the server log only; the client just gets the 503.
        logger.exception("Health check failed: database is not reachable")
        response.status_code = 503
        return HealthResponse(status="error", database="not connected")
    return HealthResponse(status="ok", database="connected")