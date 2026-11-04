from pydantic import BaseModel

from app.models import SRStatus
from app.services.aging import AgingBand


class DocumentCounts(BaseModel):
    expiring_soon: int
    expired: int


class DashboardOut(BaseModel):
    # Every key is always present (0 when there is none).
    sr_by_status: dict[SRStatus, int]
    # Pending invoices only. None for roles that never see invoices (operations).
    invoices_by_band: dict[AgingBand, int] | None
    # None unless the user is a manager or admin.
    documents: DocumentCounts | None
