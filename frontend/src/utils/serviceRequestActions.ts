import type { Role } from "../api/client";
import { SR_STATUSES, type SRStatus } from "../api/serviceRequests";

// These mirror backend/app/services/sr_status.py. They only decide which controls to show;
// the API still enforces every rule.

// The only forward step from each status. closed has none.
const NEXT_STATUS: Partial<Record<SRStatus, SRStatus>> = {
  open: "assigned",
  assigned: "in_progress",
  in_progress: "resolved",
  resolved: "closed",
};

// Which statuses a role may set through the status endpoint. A role not listed sets nothing.
const ROLE_TARGETS: Partial<Record<Role, readonly SRStatus[]>> = {
  engineer: ["in_progress", "resolved"],
  manager: SR_STATUSES,
};

// Reassigning is allowed until the engineer has started.
const ASSIGNABLE: readonly SRStatus[] = ["open", "assigned"];

// The one status this role may move a request to from `status`, or null. `assigned` is never
// a target here: it needs an engineer, so it only happens through assign. "Assigned to this
// engineer" is not checked because the API only shows an engineer their own requests.
export function nextStatusFor(role: Role | undefined, status: SRStatus): SRStatus | null {
  if (!role) return null;
  const next = NEXT_STATUS[status];
  if (!next || next === "assigned") return null;
  return ROLE_TARGETS[role]?.includes(next) ? next : null;
}

export function canAssign(role: Role | undefined, status: SRStatus): boolean {
  return role === "manager" && ASSIGNABLE.includes(status);
}

// Only the assigned engineer may add one (the API enforces that); closed requests take none.
export function canAddInvoice(role: Role | undefined, status: SRStatus): boolean {
  return role === "engineer" && status !== "closed";
}
