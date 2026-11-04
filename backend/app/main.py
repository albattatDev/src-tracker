from fastapi import Depends, FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.deps import get_optional_user
from app.core.errors import BadRequest, FieldError
from app.routers import (
    audit,
    auth,
    contractors,
    dashboard,
    documents,
    health,
    invoices,
    service_requests,
    users,
)
from app.services.contractor_documents import ContractorInactive
from app.services.contractor_lookup import ContractorNotFound
from app.services.document_storage import (
    DocumentNotFound,
    FileTooLarge,
    InvalidUpload,
    UnsupportedFileType,
)
from app.services.invoices import DuplicateInvoiceNumber, InvoiceNotFound
from app.services.service_requests import ServiceRequestNotFound
from app.services.sr_status import StatusChangeNotAllowed
from app.services.users import UserNotFound

# Default-deny: every route needs a valid JWT unless it is listed in PUBLIC_PATHS, so a
# new router cannot be left unprotected by accident.
app = FastAPI(
    title="Service Request & Compliance Tracker",
    dependencies=[Depends(get_optional_user)],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(service_requests.router)
app.include_router(invoices.router)
app.include_router(users.router)
app.include_router(contractors.router)
app.include_router(documents.router)
app.include_router(dashboard.router)
app.include_router(audit.router)


# One place that turns service errors into clean 4xx answers. The 404 text is the same for
# a request that does not exist and one the user may not see, so ids cannot be probed.
@app.exception_handler(ServiceRequestNotFound)
def service_request_not_found(request: Request, error: ServiceRequestNotFound) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND, content={"detail": "Service request not found"}
    )


@app.exception_handler(UserNotFound)
def user_not_found(request: Request, error: UserNotFound) -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"detail": "User not found"})


# Same shape as a 422, so the UI puts the message on the field it names.
@app.exception_handler(FieldError)
def field_error(request: Request, error: FieldError) -> JSONResponse:
    return JSONResponse(
        status_code=error.status_code,
        content={"detail": [{"loc": ["body", error.field], "msg": error.message}]},
    )


@app.exception_handler(InvoiceNotFound)
def invoice_not_found(request: Request, error: InvoiceNotFound) -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"detail": "Invoice not found"})


@app.exception_handler(DuplicateInvoiceNumber)
def duplicate_invoice_number(request: Request, error: DuplicateInvoiceNumber) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"detail": "An invoice with this number already exists"},
    )


@app.exception_handler(ContractorNotFound)
def contractor_not_found(request: Request, error: ContractorNotFound) -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"detail": "Contractor not found"})


@app.exception_handler(DocumentNotFound)
def document_not_found(request: Request, error: DocumentNotFound) -> JSONResponse:
    # Same text for a missing row, a missing file and an unsafe stored path.
    return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"detail": "Document not found"})


@app.exception_handler(ContractorInactive)
def contractor_inactive(request: Request, error: ContractorInactive) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"detail": "This contractor is inactive. Reactivate it before uploading documents"},
    )


@app.exception_handler(FileTooLarge)
def file_too_large(request: Request, error: FileTooLarge) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, content={"detail": str(error)}
    )


@app.exception_handler(UnsupportedFileType)
def unsupported_file_type(request: Request, error: UnsupportedFileType) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, content={"detail": str(error)}
    )


@app.exception_handler(InvalidUpload)
def invalid_upload(request: Request, error: InvalidUpload) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content={"detail": str(error)}
    )


# InvalidDateRange, InvalidStatusChange, InvalidEngineer, InvoiceNotAllowed,
# InvalidApprovalChange and InvalidInternalManager all subclass BadRequest, so this
# one handler answers them all.
@app.exception_handler(BadRequest)
def bad_request(request: Request, error: BadRequest) -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"detail": str(error)})


@app.exception_handler(StatusChangeNotAllowed)
def status_change_not_allowed(request: Request, error: StatusChangeNotAllowed) -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_403_FORBIDDEN, content={"detail": str(error)})
