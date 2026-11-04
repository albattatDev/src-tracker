import { useAuth } from "../../hooks/useAuth";
import { useInvoiceDecision } from "../../hooks/useInvoiceDecision";
import type { InvoiceOut } from "../../api/invoices";
import { canDecideInvoices } from "../../utils/permissions";
import DecisionButtons, { type DecisionSize } from "./DecisionButtons";

// The Approve/Reject bar for the shell's footer slot, rendered once the invoice has loaded. The
// buttons are empty for anyone who may not decide. The dialog is rendered even when the buttons
// are gone, so it stays up while the approved invoice is refetched.
export default function InvoiceDecisionFooter({
  invoice,
  size,
}: {
  invoice: InvoiceOut;
  size: DecisionSize;
}) {
  const { user } = useAuth();
  const { open, dialog } = useInvoiceDecision();

  return (
    <>
      {canDecideInvoices(user?.role) && (
        <DecisionButtons invoice={invoice} size={size} onDecide={open} />
      )}
      {dialog}
    </>
  );
}
