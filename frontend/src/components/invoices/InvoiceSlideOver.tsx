import { useParams } from "react-router-dom";
import { useCloseInvoice } from "../../hooks/useInvoiceListLinks";
import SlideOver from "../SlideOver";
import InvoiceBreadcrumb from "./InvoiceBreadcrumb";
import InvoiceDecisionFooter from "./InvoiceDecisionFooter";
import InvoiceDetailContent from "./InvoiceDetailContent";

// Tablet (md up to xl): the same content as the panel, as a drawer over the list.
export default function InvoiceSlideOver() {
  const id = Number(useParams().id);
  return (
    <SlideOver
      aria-label={`Invoice #${id}`}
      width={420}
      onClose={useCloseInvoice()}
      breadcrumb={<InvoiceBreadcrumb id={id} />}
      footer={<InvoiceDecisionFooter id={id} size="lg" />}
    >
      <InvoiceDetailContent id={id} />
    </SlideOver>
  );
}
