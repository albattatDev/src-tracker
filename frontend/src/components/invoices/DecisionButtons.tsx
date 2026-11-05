import { Check, X } from "lucide-react";
import type { Decision, InvoiceOut } from "../../api/invoices";
import { buttonClass } from "../buttonStyles";

export type DecisionSize = "sm" | "touch" | "lg" | "touch-lg";

// sm sits in a table cell, above the row's stretched link. lg and touch-lg are the footer bar
// of the panel, slide-over and mobile screen: a full-width row pinned under the content.
const LAYOUT: Record<DecisionSize, { wrapper: string; button: string }> = {
  sm: { wrapper: "relative z-10 flex gap-2", button: "" },
  touch: { wrapper: "relative z-10 flex gap-3", button: "flex-1" },
  lg: { wrapper: "flex shrink-0 gap-3 border-t border-line bg-surface p-4", button: "flex-1" },
  "touch-lg": { wrapper: "flex shrink-0 gap-3 border-t border-line bg-surface p-4", button: "flex-1" },
};

// Approve and Reject for a pending invoice; nothing at all for a decided one. This is the only
// place that checks "is pending". The caller checks the role.
export default function DecisionButtons({
  invoice,
  size,
  onDecide,
}: {
  invoice: InvoiceOut;
  size: DecisionSize;
  onDecide: (invoice: InvoiceOut, decision: Decision) => void;
}) {
  if (invoice.approval_status !== "pending") return null;
  const { wrapper, button } = LAYOUT[size];

  return (
    <div className={wrapper}>
      <button
        type="button"
        onClick={() => onDecide(invoice, "approve")}
        className={`${buttonClass("success", size)} ${button}`}
      >
        <Check size={16} strokeWidth={2} aria-hidden="true" />
        Approve
      </button>
      <button
        type="button"
        onClick={() => onDecide(invoice, "reject")}
        className={`${buttonClass("danger", size)} ${button}`}
      >
        <X size={16} strokeWidth={2} aria-hidden="true" />
        Reject
      </button>
    </div>
  );
}
