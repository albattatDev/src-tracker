import type { Role } from "../api/client";
import type { SRStatus } from "../api/serviceRequests";

export interface StatusAction {
  label: string;
  next: SRStatus;
}

export interface AvailableActions {
  canAssign: boolean;
  statusAction: StatusAction | null;
  canAddInvoice: boolean;
}

// Who may move a request to which status, keyed by role and the CURRENT status.
// Mirrors the backend rules; it only hides buttons the API would reject.
const STATUS_ACTIONS: Partial<Record<Role, Partial<Record<SRStatus, StatusAction>>>> = {
  engineer: {
    assigned: { label: "Start work", next: "in_progress" },
    in_progress: { label: "Mark resolved", next: "resolved" },
  },
  manager: {
    resolved: { label: "Close", next: "closed" },
  },
};

const NONE: AvailableActions = { canAssign: false, statusAction: null, canAddInvoice: false };

// Pure: same inputs, same answer, no React. "Assigned to this engineer" is not checked
// here because the API only lets an engineer open their own requests (others are 404).
export function availableActions(role: Role | undefined, status: SRStatus): AvailableActions {
  if (!role) return NONE;
  return {
    canAssign: role === "manager" && (status === "open" || status === "assigned"),
    statusAction: STATUS_ACTIONS[role]?.[status] ?? null,
    // Only the assigned engineer may add one (the API enforces that); closed requests take none.
    canAddInvoice: role === "engineer" && status !== "closed",
  };
}
