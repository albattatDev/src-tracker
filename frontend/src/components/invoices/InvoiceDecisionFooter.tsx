import { useAuth } from "../../hooks/useAuth";
import { useInvoiceDecision } from "../../hooks/useInvoiceDecision";
import { useInvoice } from "../../hooks/useInvoices";
import { canDecideInvoices } from "../../utils/permissions";
import DecisionButtons, { type DecisionSize } from "./DecisionButtons";

// The Approve/Reject bar for the footer slot of the panel, the slide-over and the mobile screen.
// It reads the invoice from the same query as the content, so it is empty until that has loaded
// and for anyone who may not decide. The dialog is rendered even when the buttons are gone, so
// it stays up while the approved invoice is refetched.
export default function InvoiceDecisionFooter({ id, size }: { id: number; size: DecisionSize }) {
  const { user } = useAuth();
  const { data: invoice } = useInvoice(id);
  const { open, dialog } = useInvoiceDecision();

  return (
    <>
      {invoice && canDecideInvoices(user?.role) && (
        <DecisionButtons invoice={invoice} size={size} onDecide={open} />
      )}
      {dialog}
    </>
  );
}
