import type { DocumentStatus } from "../api/contractors";
import type { AgingBand, ApprovalStatus, InvoiceOut } from "../api/invoices";
import type { Priority, SRStatus } from "../api/serviceRequests";
import type { UserRole } from "../api/users";

const BASE = "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium";

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
  open: { label: "Open", className: "bg-blue-100 text-blue-800" },
  assigned: { label: "Assigned", className: "bg-indigo-100 text-indigo-800" },
  in_progress: { label: "In progress", className: "bg-yellow-100 text-yellow-800" },
  resolved: { label: "Resolved", className: "bg-green-100 text-green-800" },
  closed: { label: "Closed", className: "bg-gray-200 text-gray-700" },
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  const { label, className } = PRIORITY_DISPLAY[priority];
  return <span className={`${BASE} ${className}`}>{label}</span>;
}

export function StatusBadge({ status }: { status: SRStatus }) {
  const { label, className } = STATUS_DISPLAY[status];
  return <span className={`${BASE} ${className}`}>{label}</span>;
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
    return <span className="text-gray-400">—</span>;
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

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

// The words next to the status. Day 0 reads "Expires today" (the status stays expiring_soon:
// the document is still usable that day); other days count how long is left or has passed.
export function documentStatusText(status: DocumentBadgeStatus, daysLeft?: number): string {
  const { label } = DOCUMENT_STATUS_DISPLAY[status];
  if (daysLeft === undefined) return label;
  if (status === "expiring_soon") {
    return daysLeft === 0 ? "Expires today" : `${label} · ${plural(daysLeft, "day")} left`;
  }
  if (status === "expired") return `${label} · ${plural(-daysLeft, "day")} ago`;
  return label;
}

// Display only: it never changes anything, so admins see it too.
export function DocumentStatusBadge({
  status,
  daysLeft,
}: {
  status: DocumentBadgeStatus;
  daysLeft?: number;
}) {
  return (
    <span className={`${BASE} ${DOCUMENT_STATUS_DISPLAY[status].className}`}>
      {documentStatusText(status, daysLeft)}
    </span>
  );
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
