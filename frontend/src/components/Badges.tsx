import type { AuditAction } from "../api/audit";
import type { DocumentStatus } from "../api/contractors";
import type { AgingBand, ApprovalStatus, InvoiceOut } from "../api/invoices";
import type { Priority, SRStatus } from "../api/serviceRequests";
import type { UserRole } from "../api/users";

const BASE = "inline-block shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium";

// A pill in any of the colour sets below, for text that is not one of the badge components
// (a legend row, a chip that is also a link).
export function pillClass(colors: string): string {
  return `${BASE} ${colors}`;
}

// A count of 0 is shown grey, whatever the category's own colour is.
export const NEUTRAL_PILL = "bg-gray-100 text-gray-700";

interface Display {
  label: string;
  className: string;
}

// One place per enum for how a value looks: its text and its colors.
export const PRIORITY_DISPLAY: Record<Priority, Display> = {
  low: { label: "Low", className: "bg-gray-100 text-gray-700" },
  medium: { label: "Medium", className: "bg-amber-100 text-amber-800" },
  high: { label: "High", className: "bg-red-100 text-red-800" },
};

export const STATUS_DISPLAY: Record<SRStatus, Display> = {
  open: { label: "Open", className: "bg-sky-100 text-sky-800" },
  assigned: { label: "Assigned", className: "bg-indigo-100 text-indigo-800" },
  in_progress: { label: "In progress", className: "bg-yellow-100 text-yellow-800" },
  resolved: { label: "Resolved", className: "bg-green-100 text-green-800" },
  closed: { label: "Closed", className: "bg-violet-100 text-violet-800" },
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  const { label, className } = PRIORITY_DISPLAY[priority];
  return <span className={`${BASE} ${className}`}>{label}</span>;
}

// The same pill with room for an icon after the label (a button that opens a menu). Its own
// base string, so the smaller right padding does not fight BASE's px-2.5.
const BASE_WITH_ICON =
  "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full py-0.5 pl-2.5 pr-1.5 text-xs font-medium";

// The classes of a status pill, for anything that has to look like StatusBadge.
export function statusPillClass(status: SRStatus, trailingIcon = false): string {
  return `${trailingIcon ? BASE_WITH_ICON : BASE} ${STATUS_DISPLAY[status].className}`;
}

export function StatusBadge({ status }: { status: SRStatus }) {
  return <span className={statusPillClass(status)}>{STATUS_DISPLAY[status].label}</span>;
}

export const APPROVAL_DISPLAY: Record<ApprovalStatus, Display> = {
  pending: { label: "Pending", className: "bg-blue-100 text-blue-800" },
  approved: { label: "Approved", className: "bg-green-100 text-green-800" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-800" },
};

export function ApprovalStatusBadge({ status }: { status: ApprovalStatus }) {
  const { label, className } = APPROVAL_DISPLAY[status];
  return <span className={`${BASE} ${className}`}>{label}</span>;
}

// Colour and word both carry the band, so it does not depend on colour alone.
export const AGING_DISPLAY: Record<AgingBand, Display> = {
  green: { label: "Normal", className: "bg-green-100 text-green-800" },
  yellow: { label: "Warning", className: "bg-yellow-100 text-yellow-800" },
  orange: { label: "Overdue", className: "bg-orange-100 text-orange-800" },
  red: { label: "Critical", className: "bg-red-100 text-red-800" },
};

function ageText(ageDays: number): string {
  if (ageDays < 0) return `Due in ${-ageDays} ${-ageDays === 1 ? "day" : "days"}`;
  return `${ageDays} ${ageDays === 1 ? "day" : "days"}`;
}

// Only pending invoices age. Decided ones (approved or rejected) show a dash: no band
// colour and no day count, even though the API sends both. The Status column says which.
export function AgingBadge({
  invoice,
}: {
  invoice: Pick<InvoiceOut, "approval_status" | "age_days" | "aging_band">;
}) {
  if (invoice.approval_status !== "pending") {
    return <span className="text-muted">—</span>;
  }
  const { label, className } = AGING_DISPLAY[invoice.aging_band];
  return (
    <span className={`${BASE} ${className}`}>
      {ageText(invoice.age_days)} · {label}
    </span>
  );
}

// A document type with no upload yet has no API status; the UI shows it as "missing".
export type DocumentBadgeStatus = DocumentStatus | "missing";

export const DOCUMENT_STATUS_DISPLAY: Record<DocumentBadgeStatus, Display> = {
  valid: { label: "Valid", className: "bg-green-100 text-green-800" },
  expiring_soon: { label: "Expiring soon", className: "bg-yellow-100 text-yellow-800" },
  expired: { label: "Expired", className: "bg-red-100 text-red-800" },
  missing: { label: "Missing", className: "bg-gray-100 text-gray-700" },
};

// Display only: it never changes anything, so admins see it too. The words next to it
// ("12 days left") are utils/documents.ts's documentDaysNote.
export function DocumentStatusBadge({ status }: { status: DocumentBadgeStatus }) {
  const { label, className } = DOCUMENT_STATUS_DISPLAY[status];
  return <span className={`${BASE} ${className}`}>{label}</span>;
}

// "2 expired" / "1 expiring": a count of one kind of problem document, in that status's colors.
const CHIP_WORD: Record<"expired" | "expiring_soon", string> = {
  expired: "expired",
  expiring_soon: "expiring",
};

export function DocumentCountChip({
  status,
  count,
}: {
  status: "expired" | "expiring_soon";
  count: number;
}) {
  return (
    <span className={`${BASE} ${DOCUMENT_STATUS_DISPLAY[status].className}`}>
      {count} {CHIP_WORD[status]}
    </span>
  );
}

// Active or inactive (a contractor or a user is deactivated instead of deleted). Word and colour
// both carry it.
export const ACTIVE_DISPLAY: Record<"active" | "inactive", Display> = {
  active: { label: "Active", className: "bg-green-100 text-green-800" },
  inactive: { label: "Inactive", className: "bg-gray-200 text-gray-700" },
};

export function ActiveBadge({ isActive }: { isActive: boolean }) {
  const { label, className } = ACTIVE_DISPLAY[isActive ? "active" : "inactive"];
  return <span className={`${BASE} ${className}`}>{label}</span>;
}

export const ROLE_DISPLAY: Record<UserRole, Display> = {
  operations: { label: "Operations", className: "bg-blue-100 text-blue-800" },
  engineer: { label: "Engineer", className: "bg-indigo-100 text-indigo-800" },
  manager: { label: "Manager", className: "bg-amber-100 text-amber-800" },
  admin: { label: "Admin", className: "bg-gray-800 text-white" },
};

export function RoleBadge({ role }: { role: UserRole }) {
  const { label, className } = ROLE_DISPLAY[role];
  return <span className={`${BASE} ${className}`}>{label}</span>;
}

export const AUDIT_ACTION_DISPLAY: Record<AuditAction, Display> = {
  create: { label: "Create", className: "bg-green-100 text-green-800" },
  update: { label: "Update", className: "bg-blue-100 text-blue-800" },
  delete: { label: "Delete", className: "bg-red-100 text-red-800" },
  approve: { label: "Approve", className: "bg-green-100 text-green-800" },
  assign: { label: "Assign", className: "bg-indigo-100 text-indigo-800" },
  reject: { label: "Reject", className: "bg-red-100 text-red-800" },
};

// The API sends action as a plain string; an action this UI does not know is shown as is, grey.
export function AuditActionBadge({ action }: { action: string }) {
  const known = (AUDIT_ACTION_DISPLAY as Record<string, Display | undefined>)[action];
  const { label, className } = known ?? { label: action, className: "bg-gray-100 text-gray-700" };
  return <span className={`${BASE} ${className}`}>{label}</span>;
}
