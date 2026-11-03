from fastapi import Depends, FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.deps import get_optional_user
from app.core.errors import BadRequest
from app.routers import auth, health, invoices, service_requests, users
from app.services.invoices import DuplicateInvoiceNumber, InvoiceNotFound
from app.services.service_requests import ServiceRequestNotFound
from app.services.sr_status import StatusChangeNotAllowed

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


# One place that turns service errors into clean 4xx answers. The 404 text is the same for
# a request that does not exist and one the user may not see, so ids cannot be probed.
@app.exception_handler(ServiceRequestNotFound)
def service_request_not_found(request: Request, error: ServiceRequestNotFound) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND, content={"detail": "Service request not found"}
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


# InvalidDateRange, InvalidStatusChange, InvalidEngineer, InvoiceNotAllowed and
# InvalidApprovalChange all subclass BadRequest, so this
# one handler answers them all.
@app.exception_handler(BadRequest)
def bad_request(request: Request, error: BadRequest) -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"detail": str(error)})


@app.exception_handler(StatusChangeNotAllowed)
def status_change_not_allowed(request: Request, error: StatusChangeNotAllowed) -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_403_FORBIDDEN, content={"detail": str(error)})
