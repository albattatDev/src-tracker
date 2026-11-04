import { Link } from "react-router-dom";
import { useInvoiceListLinks } from "../../hooks/useInvoiceListLinks";
import { useInvoice } from "../../hooks/useInvoices";

// "Invoices / INV-…" for the panel header (inline panel and slide-over). The invoice number
// shows once it has loaded; until then (and if it never does) the id stands in.
export default function InvoiceBreadcrumb({ id }: { id: number }) {
  const { listPath } = useInvoiceListLinks();
  const { data } = useInvoice(id);
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      <Link to={listPath} className="text-muted hover:text-ink">
        Invoices
      </Link>
      <span aria-hidden="true" className="text-muted">
        /
      </span>
      <span className="truncate font-medium">{data?.invoice_number ?? `#${id}`}</span>
    </nav>
  );
}
