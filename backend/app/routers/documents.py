from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_role
from app.models import UserRole
from app.services.contractor_documents import get_document_file

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get(
    "/{document_id}/download",
    response_class=FileResponse,
    dependencies=[Depends(require_role(UserRole.MANAGER, UserRole.ADMIN))],
)
def download_document(document_id: int, db: Session = Depends(get_db)) -> FileResponse:
    path, filename, media_type = get_document_file(db, document_id)
    return FileResponse(path, filename=filename, media_type=media_type)
