import { useState } from "react";
import { Link } from "react-router-dom";
import type { Decision, InvoiceOut } from "../api/invoices";
import { useDecideInvoice } from "../hooks/useInvoices";
import { useRowNavigation } from "../hooks/useRowNavigation";
import { formatDate } from "../utils/dates";
import { formatAmount } from "../utils/money";
import { AgingBadge, ApprovalStatusBadge } from "./Badges";
import Amount from "./Amount";
import { buttonClass } from "./buttonStyles";
import ConfirmDialog from "./ConfirmDialog";

const DECISION_TEXT: Record<Decision, { verb: string; running: string }> = {
  approve: { verb: "Approve", running: "Approving…" },
  reject: { verb: "Reject", running: "Rejecting…" },
};

export default function InvoiceTable({
  items,
  showRequest = true,
  canDecide = false,
  dimmed = false,
}: {
  items: InvoiceOut[];
  showRequest?: boolean; // false on the SR detail page, where the request is already known
  canDecide?: boolean; // managers only
  dimmed?: boolean;
}) {
  const [pending, setPending] = useState<{ invoice: InvoiceOut; decision: Decision } | null>(null);
  const decide = useDecideInvoice();
  const { rowProps } = useRowNavigation();

  function open(invoice: InvoiceOut, decision: Decision) {
    decide.reset(); // an old error must not show up in the next dialog
    setPending({ invoice, decision });
  }

  function confirm() {
    if (!pending) return;
    decide.mutate(
      { id: pending.invoice.id, decision: pending.decision },
      { onSuccess: () => setPending(null) }
    );
  }

  return (
    <>
    <div
      className={`overflow-x-auto rounded-lg border border-gray-200 bg-white ${
        dimmed ? "opacity-60" : ""
      }`}
    >
      <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-3 py-2">Invoice #</th>
            {showRequest && <th className="px-3 py-2">Service request</th>}
            <th className="px-3 py-2 text-right">Amount (SAR)</th>
            <th className="px-3 py-2">Due</th>
            <th className="px-3 py-2">Age</th>
            <th className="px-3 py-2">Status</th>
            {canDecide && <th className="px-3 py-2">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((invoice) => (
            // The row goes where its "Service request" link goes. Without that column (the SR
            // detail page) there is nowhere to go, so the row stays inert.
            <tr
              key={invoice.id}
              {...rowProps(showRequest ? `/service-requests/${invoice.service_request_id}` : undefined)}
            >
              <td className="whitespace-nowrap px-3 py-2 font-medium text-gray-900">
                {invoice.invoice_number}
              </td>
              {showRequest && (
                <td className="px-3 py-2">
                  <Link
                    to={`/service-requests/${invoice.service_request_id}`}
                    className="text-gray-900 hover:underline"
                  >
                    #{invoice.service_request_id} · {invoice.service_request_title}
                  </Link>
                </td>
              )}
              <td className="whitespace-nowrap px-3 py-2 text-right">
                <Amount value={invoice.amount} />
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-gray-700">
                {invoice.due_date ? formatDate(invoice.due_date) : "—"}
              </td>
              <td className="whitespace-nowrap px-3 py-2">
                <AgingBadge invoice={invoice} />
              </td>
              <td className="px-3 py-2">
                <ApprovalStatusBadge status={invoice.approval_status} />
              </td>
              {canDecide && (
                <td className="whitespace-nowrap px-3 py-2">
                  {invoice.approval_status === "pending" && (
                    <div className="flex gap-2">
                      <button
                        className={buttonClass("success", "sm")}
                        onClick={() => open(invoice, "approve")}
                      >
                        Approve
                      </button>
                      <button
                        className={buttonClass("danger", "sm")}
                        onClick={() => open(invoice, "reject")}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {pending && (
      <ConfirmDialog
        title={`${DECISION_TEXT[pending.decision].verb} invoice`}
        message={`${DECISION_TEXT[pending.decision].verb} invoice ${pending.invoice.invoice_number} (${formatAmount(pending.invoice.amount)}) for #${pending.invoice.service_request_id} ${pending.invoice.service_request_title}?`}
        confirmLabel={
          decide.isPending
            ? DECISION_TEXT[pending.decision].running
            : DECISION_TEXT[pending.decision].verb
        }
        tone={pending.decision}
        onConfirm={confirm}
        onCancel={() => setPending(null)}
        isLoading={decide.isPending}
        error={decide.error?.message ?? null}
      />
    )}
    </>
  );
}
