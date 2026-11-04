import { useParams } from "react-router-dom";
import { useInvoice } from "../../hooks/useInvoices";
import { useListLinks } from "../../hooks/useListLinks";
import { INVOICES_BASE } from "../../routes";
import { fromQuery } from "../detail/detailStatus";
import DetailShell from "../detail/DetailShell";
import DetailState from "../detail/DetailState";
import InvoiceDecisionFooter from "./InvoiceDecisionFooter";
import InvoiceDetailBody from "./InvoiceDetailBody";

// The element of /invoices/:id. It loads the invoice and hands the shell the pieces; the shell
// picks the panel, the slide-over or the full screen. The title is the invoice number once it
// has loaded; until then (and if it never does) the id stands in.
export default function InvoiceDetailRoute() {
  const id = Number(useParams().id);
  const { listPath } = useListLinks(INVOICES_BASE);
  const status = fromQuery(useInvoice(id));
  const title = status.kind === "ready" ? status.data.invoice_number : `Invoice #${id}`;

  return (
    <DetailShell
      aria-label={`Invoice #${id}`}
      width={420}
      storageKey="srct.panelWidth.invoice"
      list={{ label: "Invoices", path: listPath }}
      title={title}
      footer={({ mobile }) =>
        status.kind === "ready" && (
          <InvoiceDecisionFooter invoice={status.data} size={mobile ? "touch-lg" : "lg"} />
        )
      }
    >
      {() => (
        <DetailState status={status} notFoundText="Invoice not found">
          {(invoice) => <InvoiceDetailBody invoice={invoice} />}
        </DetailState>
      )}
    </DetailShell>
  );
}
