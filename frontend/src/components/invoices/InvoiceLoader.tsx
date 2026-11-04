import type { ReactNode } from "react";
import type { InvoiceOut } from "../../api/invoices";
import { useInvoice } from "../../hooks/useInvoices";
import { buttonClass } from "../buttonStyles";

// Loads one invoice and shows the loading, not-found and error states, so the panel, the
// slide-over and the mobile screen only write what they show once the invoice is there.
export default function InvoiceLoader({
  id,
  children,
}: {
  id: number;
  children: (invoice: InvoiceOut) => ReactNode;
}) {
  const query = useInvoice(id);

  // A non-numeric id never reaches the API (the query is disabled), so it is "not found" too.
  const notFound = !query.isEnabled || (query.isError && query.error.status === 404);
  if (notFound) return <p className="p-4 text-ink-soft">Invoice not found</p>;
  if (query.isPending) return <p className="p-4 text-muted">Loading…</p>;
  if (query.isError) {
    return (
      <div className="p-4">
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          <p className="mb-3">{query.error.message}</p>
          <button type="button" onClick={() => query.refetch()} className={buttonClass("primary", "md")}>
            Retry
          </button>
        </div>
      </div>
    );
  }
  return <>{children(query.data)}</>;
}
