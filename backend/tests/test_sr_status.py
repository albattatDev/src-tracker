"""The status rules are pure functions, so these tests need no database."""

import pytest

from app.models import SRStatus, UserRole
from app.services.sr_status import (
    InvalidStatusChange,
    StatusChangeNotAllowed,
    can_assign,
    check_role_can_set,
    check_status_change,
)

S = SRStatus


@pytest.mark.parametrize(
    "current, new",
    [(S.ASSIGNED, S.IN_PROGRESS), (S.IN_PROGRESS, S.RESOLVED), (S.RESOLVED, S.CLOSED)],
)
def test_valid_steps_are_accepted(current, new):
    check_status_change(current, new)


@pytest.mark.parametrize(
    "current, new",
    [
        (S.OPEN, S.CLOSED),
        (S.OPEN, S.IN_PROGRESS),
        (S.CLOSED, S.OPEN),
        (S.CLOSED, S.CLOSED),
        (S.ASSIGNED, S.RESOLVED),
        (S.IN_PROGRESS, S.ASSIGNED),
        (S.RESOLVED, S.IN_PROGRESS),
        (S.IN_PROGRESS, S.IN_PROGRESS),
    ],
)
def test_other_changes_are_invalid(current, new):
    with pytest.raises(InvalidStatusChange):
        check_status_change(current, new)


def test_open_to_assigned_is_refused_here_with_a_pointer_to_assign():
    with pytest.raises(InvalidStatusChange, match="assign"):
        check_status_change(S.OPEN, S.ASSIGNED)


def test_the_message_names_both_statuses():
    with pytest.raises(InvalidStatusChange, match="'open' to 'closed'"):
        check_status_change(S.OPEN, S.CLOSED)


@pytest.mark.parametrize("new", [S.IN_PROGRESS, S.RESOLVED])
def test_engineer_may_set_in_progress_and_resolved(new):
    check_role_can_set(UserRole.ENGINEER, new)


@pytest.mark.parametrize("new", [S.OPEN, S.ASSIGNED, S.CLOSED])
def test_engineer_may_not_set_other_statuses(new):
    with pytest.raises(StatusChangeNotAllowed):
        check_role_can_set(UserRole.ENGINEER, new)


@pytest.mark.parametrize("new", list(SRStatus))
def test_manager_may_set_any_status_here(new):
    check_role_can_set(UserRole.MANAGER, new)


@pytest.mark.parametrize("role", [UserRole.OPERATIONS, UserRole.ADMIN])
@pytest.mark.parametrize("new", list(SRStatus))
def test_a_role_with_no_status_rights_is_denied(role, new):
    """Denied by default: this must hold even if a router ever lets the role through."""
    with pytest.raises(StatusChangeNotAllowed):
        check_role_can_set(role, new)


@pytest.mark.parametrize(
    "current, expected",
    [
        (S.OPEN, True),
        (S.ASSIGNED, True),
        (S.IN_PROGRESS, False),
        (S.RESOLVED, False),
        (S.CLOSED, False),
    ],
)
def test_can_assign_only_before_work_starts(current, expected):
    assert can_assign(current) is expected
