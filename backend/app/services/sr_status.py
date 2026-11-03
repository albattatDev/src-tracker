"""The service request status rules (SPEC §3). Pure functions: no database, so every rule
is unit tested on its own and both PATCH endpoints ask here instead of repeating them.
"""

from app.core.errors import BadRequest
from app.models import SRStatus, UserRole

# The only forward step from each status. closed has none, so nothing leaves it.
NEXT_STATUS = {
    SRStatus.OPEN: SRStatus.ASSIGNED,
    SRStatus.ASSIGNED: SRStatus.IN_PROGRESS,
    SRStatus.IN_PROGRESS: SRStatus.RESOLVED,
    SRStatus.RESOLVED: SRStatus.CLOSED,
}

# Which statuses each role may set. Engineers do the work; closing is the manager's job
# (SPEC §2). A role not listed here may set nothing, so a new role is denied by default.
ROLE_TARGETS = {
    UserRole.ENGINEER: frozenset({SRStatus.IN_PROGRESS, SRStatus.RESOLVED}),
    UserRole.MANAGER: frozenset(SRStatus),
}

# Reassigning is allowed until the engineer has started.
ASSIGNABLE = frozenset({SRStatus.OPEN, SRStatus.ASSIGNED})


class InvalidStatusChange(BadRequest):
    """The requested status does not follow the lifecycle. The message is safe to show."""


class StatusChangeNotAllowed(Exception):
    """This role may not set the requested status. The message is safe to show."""


def check_status_change(current: SRStatus, new: SRStatus) -> None:
    """Raises unless `new` is the next step after `current`. `assigned` is never accepted
    here: it needs an engineer, so it only happens through the assign endpoint."""
    if new == SRStatus.ASSIGNED:
        raise InvalidStatusChange(
            "Use PATCH /service-requests/{id}/assign to assign a request"
        )
    if NEXT_STATUS.get(current) != new:
        raise InvalidStatusChange(
            f"Cannot change status from '{current.value}' to '{new.value}'"
        )


def check_role_can_set(role: UserRole, new: SRStatus) -> None:
    """Raises unless `role` is allowed to set `new`. Does not rely on the router's
    require_role: a role missing from ROLE_TARGETS is denied here too."""
    if new not in ROLE_TARGETS.get(role, frozenset()):
        raise StatusChangeNotAllowed(f"Your role cannot move a request to '{new.value}'")


def can_assign(current: SRStatus) -> bool:
    return current in ASSIGNABLE
