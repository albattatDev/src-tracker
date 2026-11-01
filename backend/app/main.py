from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.deps import get_optional_user
from app.routers import auth, health

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
