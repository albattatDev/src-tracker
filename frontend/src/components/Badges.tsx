import type { Priority, SRStatus } from "../api/serviceRequests";

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
