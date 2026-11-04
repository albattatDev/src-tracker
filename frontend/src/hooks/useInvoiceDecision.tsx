import { useState, type ReactNode } from "react";
import type { Decision, InvoiceOut } from "../api/invoices";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";
import { formatAmount } from "../utils/money";
import { useDecideInvoice } from "./useInvoices";

const DECISION_TEXT: Record<Decision, { verb: string; running: string; done: string }> = {
  approve: { verb: "Approve", running: "Approving…", done: "approved" },
  reject: { verb: "Reject", running: "Rejecting…", done: "rejected" },
};

// The approve/reject flow: open(invoice, decision) shows a ConfirmDialog, a confirmed decision
// is sent, and a toast says what happened.
// The caller MUST render the returned `dialog` somewhere in its output, or open() shows nothing.
export function useInvoiceDecision(): {
  open: (invoice: InvoiceOut, decision: Decision) => void;
  dialog: ReactNode;
} {
  const [pending, setPending] = useState<{ invoice: InvoiceOut; decision: Decision } | null>(null);
  const toast = useToast();
  // The toast and the close are callbacks of the mutation, so they run even when the list that
  // started the decision has unmounted after the refetch.
  const decide = useDecideInvoice((invoice, { decision }) => {
    setPending(null);
    toast.show(`Invoice ${invoice.invoice_number} ${DECISION_TEXT[decision].done}`);
  });

  function open(invoice: InvoiceOut, decision: Decision) {
    decide.reset(); // an old error must not show up in the next dialog
    setPending({ invoice, decision });
  }

  const dialog = pending && (
    <ConfirmDialog
      title={`${DECISION_TEXT[pending.decision].verb} invoice`}
      message={`${DECISION_TEXT[pending.decision].verb} invoice ${pending.invoice.invoice_number} (${formatAmount(pending.invoice.amount)}) for #${pending.invoice.service_request_id} ${pending.invoice.service_request_title}?`}
      confirmLabel={
        decide.isPending ? DECISION_TEXT[pending.decision].running : DECISION_TEXT[pending.decision].verb
      }
      tone={pending.decision}
      onConfirm={() => decide.mutate({ id: pending.invoice.id, decision: pending.decision })}
      onCancel={() => setPending(null)}
      isLoading={decide.isPending}
      error={decide.error?.message ?? null}
    />
  );

  return { open, dialog };
}
