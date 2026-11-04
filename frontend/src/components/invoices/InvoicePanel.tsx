import { useParams } from "react-router-dom";
import { useCloseInvoice } from "../../hooks/useInvoiceListLinks";
import SidePanel from "../SidePanel";
import InvoiceBreadcrumb from "./InvoiceBreadcrumb";
import InvoiceDecisionFooter from "./InvoiceDecisionFooter";
import InvoiceDetailContent from "./InvoiceDetailContent";

// Desktop (xl and up): the resizable panel beside the list.
export default function InvoicePanel() {
  const id = Number(useParams().id);
  return (
    <SidePanel
      aria-label={`Invoice #${id}`}
      defaultWidth={420}
      storageKey="srct.panelWidth.invoice"
      onClose={useCloseInvoice()}
      breadcrumb={<InvoiceBreadcrumb id={id} />}
      footer={<InvoiceDecisionFooter id={id} size="lg" />}
    >
      <InvoiceDetailContent id={id} />
    </SidePanel>
  );
}
