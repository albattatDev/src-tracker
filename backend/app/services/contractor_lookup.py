"""Finding and locking one contractor row. Both the contractor service and the document
service need this, and neither may import the other (the contractor detail embeds documents,
and uploading needs the contractor), so it lives here, below both."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Contractor


class ContractorNotFound(Exception):
    """No contractor with this id."""


def require_contractor(db: Session, contractor_id: int) -> None:
    """A plain existence check, no lock. Raises ContractorNotFound."""
    if db.scalar(select(Contractor.id).where(Contractor.id == contractor_id)) is None:
        raise ContractorNotFound()


def lock_contractor(db: Session, contractor_id: int) -> Contractor:
    """The contractor row, locked until the transaction ends (so it cannot be deactivated or
    edited by someone else meanwhile) and refreshed from the database. Raises
    ContractorNotFound."""
    contractor = db.scalars(
        select(Contractor)
        .where(Contractor.id == contractor_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    ).one_or_none()
    if contractor is None:
        raise ContractorNotFound()
    return contractor
