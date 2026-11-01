from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models import Priority, SRStatus


class SRRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    priority: Priority
    status: SRStatus
    requester_name: str
    assigned_engineer_name: str | None
    created_at: datetime
    updated_at: datetime
