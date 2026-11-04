import { useState } from "react";
import type { InvoiceOut } from "../../api/invoices";
import type { SRRead } from "../../api/serviceRequests";
import { useAuth } from "../../hooks/useAuth";
import { useInvoices } from "../../hooks/useInvoices";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { formatDate } from "../../utils/dates";
import { canAddInvoice } from "../../utils/serviceRequestActions";
import { canViewInvoices } from "../../utils/permissions";
import Amount from "../Amount";
import { AgingBadge, ApprovalStatusBadge } from "../Badges";
import BottomSheet from "../BottomSheet";
import { buttonClass } from "../buttonStyles";
import CrossLink from "../CrossLink";
import Modal from "../Modal";
import AddInvoiceForm from "./AddInvoiceForm";

function InvoiceCard({ invoice }: { invoice: InvoiceOut }) {
  return (
    <li className="rounded-xl border border-line p-3">
      <div className="flex items-center justify-between gap-3">
        <CrossLink to={`/invoices/${invoice.id}`} className="min-h-11 font-medium md:min-h-0">
          {invoice.invoice_number}
        </CrossLink>
        <Amount value={invoice.amount} className="font-medium" />
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">
          {invoice.due_date ? `Due ${formatDate(invoice.due_date)}` : "No due date"}
        </span>
        {invoice.approval_status === "pending" && <AgingBadge invoice={invoice} />}
        <ApprovalStatusBadge status={invoice.approval_status} />
      </div>
    </li>
  );
}

// The invoices linked to one request. Operations cannot call /invoices (403), so the section
// is not rendered for them at all. Engineers who may add one get an "Add invoice" button: the
// form opens in a Modal on desktop and in a bottom sheet on mobile.
export default function LinkedInvoices({ sr }: { sr: SRRead }) {
  const { user } = useAuth();
  const isMobile = useBreakpoint() === "mobile";
  const [adding, setAdding] = useState(false);
  const canView = canViewInvoices(user?.role);
  const query = useInvoices(
    { service_request_id: sr.id, sort: "created_at", order: "desc", page_size: 100 },
    canView
  );

  if (!canView) return null;

  const close = () => setAdding(false);
  const form = (size: "md" | "touch") => (
    <AddInvoiceForm sr={sr} size={size} onDone={close} onCancel={close} />
  );

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">
          Invoices
          {query.data && <span className="ml-1.5 font-normal text-muted">{query.data.total}</span>}
        </h3>
        {canAddInvoice(user?.role, sr.status) && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            aria-haspopup="dialog"
            className={buttonClass("secondary", isMobile ? "touch" : "sm")}
          >
            Add invoice
          </button>
        )}
      </div>

      {query.isPending ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : query.isError ? (
        <p role="alert" className="text-sm text-red-700">
          {query.error.message}
        </p>
      ) : query.data.items.length === 0 ? (
        <p className="text-sm text-muted">No invoices linked to this request.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {query.data.items.map((invoice) => (
            <InvoiceCard key={invoice.id} invoice={invoice} />
          ))}
        </ul>
      )}

      {adding &&
        (isMobile ? (
          <BottomSheet title="Add invoice" onClose={close}>
            {form("touch")}
          </BottomSheet>
        ) : (
          <Modal title="Add invoice" onClose={close}>
            {form("md")}
          </Modal>
        ))}
    </section>
  );
}
