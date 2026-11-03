from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_role
from app.models import DocType, User, UserRole
from app.schemas.contractor import (
    ContractorCreate,
    ContractorDetail,
    ContractorListParams,
    ContractorOut,
    ContractorPage,
    ContractorUpdate,
    DocumentOut,
)
from app.services.contractor_documents import list_documents, upload_document
from app.services.contractors import (
    create_contractor,
    get_contractor,
    list_contractors,
    update_contractor,
)

# Service errors (not found, inactive, bad file, bad manager) become 4xx answers in the
# handlers registered in app.main.
router = APIRouter(prefix="/contractors", tags=["contractors"])

# Admin reads only; every write is manager-only.
VIEWERS = (UserRole.MANAGER, UserRole.ADMIN)


@router.get("", response_model=ContractorPage, dependencies=[Depends(require_role(*VIEWERS))])
def list_all_contractors(
    params: Annotated[ContractorListParams, Query()],
    db: Session = Depends(get_db),
) -> ContractorPage:
    return list_contractors(db, params)


@router.post("", response_model=ContractorOut, status_code=status.HTTP_201_CREATED)
def create_new_contractor(
    data: ContractorCreate,
    user: User = Depends(require_role(UserRole.MANAGER)),
    db: Session = Depends(get_db),
) -> ContractorOut:
    return create_contractor(db, user, data)


@router.get(
    "/{contractor_id}",
    response_model=ContractorDetail,
    dependencies=[Depends(require_role(*VIEWERS))],
)
def get_one_contractor(contractor_id: int, db: Session = Depends(get_db)) -> ContractorDetail:
    return get_contractor(db, contractor_id)


@router.patch("/{contractor_id}", response_model=ContractorOut)
def patch_contractor(
    contractor_id: int,
    data: ContractorUpdate,
    user: User = Depends(require_role(UserRole.MANAGER)),
    db: Session = Depends(get_db),
) -> ContractorOut:
    return update_contractor(db, user, contractor_id, data)


@router.post(
    "/{contractor_id}/documents",
    response_model=DocumentOut,
    status_code=status.HTTP_201_CREATED,
)
def upload_contractor_document(
    contractor_id: int,
    doc_type: Annotated[DocType, Form()],
    expiry_date: Annotated[date, Form()],
    file: Annotated[UploadFile, File()],
    user: User = Depends(require_role(UserRole.MANAGER)),
    db: Session = Depends(get_db),
) -> DocumentOut:
    return upload_document(db, user, contractor_id, doc_type, expiry_date, file)


@router.get(
    "/{contractor_id}/documents",
    response_model=list[DocumentOut],
    dependencies=[Depends(require_role(*VIEWERS))],
)
def list_contractor_documents(
    contractor_id: int,
    doc_type: DocType | None = None,
    db: Session = Depends(get_db),
) -> list[DocumentOut]:
    return list_documents(db, contractor_id, doc_type)
