import type { ReactNode } from "react";
import type { InvoiceOut } from "../../api/invoices";
import { formatDate, formatRiyadh } from "../../utils/dates";
import { formatAmountNumber } from "../../utils/money";
import { PersonName } from "../Avatar";
import { AgingBadge, ApprovalStatusBadge } from "../Badges";
import CrossLink from "../CrossLink";
import InvoiceLoader from "./InvoiceLoader";

const LABEL = "text-xs font-medium uppercase tracking-wide text-muted";

function PropertyRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center gap-3">
      <dt className={`w-[88px] shrink-0 ${LABEL}`}>{label}</dt>
      <dd className="min-w-0 flex-1 text-sm">{children}</dd>
    </div>
  );
}

function agingHint(invoice: InvoiceOut): string {
  if (invoice.approval_status !== "pending") {
    return "Aging stops once an invoice is approved or rejected.";
  }
  return invoice.due_date ? "counted from the due date" : "counted from the submission date";
}

function InvoiceBody({ invoice }: { invoice: InvoiceOut }) {
  const decided = invoice.approval_status !== "pending";
  const decider = invoice.approval_status === "rejected" ? "Rejected by" : "Approved by";

  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="min-w-0 truncate text-xl font-semibold">{invoice.invoice_number}</h2>
        <ApprovalStatusBadge status={invoice.approval_status} />
      </div>

      <div className="mt-4">
        <p className={LABEL}>Amount</p>
        <p className="mt-1 tabular-nums">
          <span className="text-3xl font-semibold">{formatAmountNumber(invoice.amount)}</span>{" "}
          <span className="text-base text-muted">SAR</span>
        </p>
      </div>

      <div className="mt-5">
        <p className={LABEL}>Aging</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <AgingBadge invoice={invoice} />
          <span className="text-sm text-ink-soft">{agingHint(invoice)}</span>
        </div>
      </div>

      <dl className="mt-5 flex flex-col">
        <PropertyRow label="Request">
          <CrossLink to={`/service-requests/${invoice.service_request_id}`} className="min-h-11 md:min-h-0">
            #{invoice.service_request_id} · {invoice.service_request_title}
          </CrossLink>
        </PropertyRow>
        <PropertyRow label="Submitted">{formatDate(invoice.submission_date)}</PropertyRow>
        <PropertyRow label="Due">{invoice.due_date ? formatDate(invoice.due_date) : "—"}</PropertyRow>
        <PropertyRow label="Added by">
          <PersonName name={invoice.created_by_name} />
        </PropertyRow>
        {decided && (
          <>
            <PropertyRow label={decider}>
              <PersonName name={invoice.approved_by_name} />
            </PropertyRow>
            <PropertyRow label="Decided at">
              {invoice.approved_at ? formatRiyadh(invoice.approved_at) : "—"}
            </PropertyRow>
          </>
        )}
      </dl>
    </div>
  );
}

// What the panel, the slide-over and the mobile screen all show for one invoice. The
// Approve/Reject bar is not part of it: each screen puts InvoiceDecisionFooter in its footer slot.
export default function InvoiceDetailContent({ id }: { id: number }) {
  return <InvoiceLoader id={id}>{(invoice) => <InvoiceBody key={invoice.id} invoice={invoice} />}</InvoiceLoader>;
}
