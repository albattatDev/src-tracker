from fastapi import Depends, FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.deps import get_optional_user
from app.routers import auth, health, service_requests
from app.services.service_requests import InvalidDateRange, ServiceRequestNotFound

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


# One place that turns service errors into clean 4xx answers. The 404 text is the same for
# a request that does not exist and one the user may not see, so ids cannot be probed.
@app.exception_handler(ServiceRequestNotFound)
def service_request_not_found(request: Request, error: ServiceRequestNotFound) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND, content={"detail": "Service request not found"}
    )


@app.exception_handler(InvalidDateRange)
def invalid_date_range(request: Request, error: InvalidDateRange) -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"detail": str(error)})
