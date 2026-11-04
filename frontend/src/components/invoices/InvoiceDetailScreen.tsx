import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useInvoiceListLinks } from "../../hooks/useInvoiceListLinks";
import { useInvoice } from "../../hooks/useInvoices";
import { buttonClass } from "../buttonStyles";
import { TopBarOverride } from "../shell/TopBarContext";
import InvoiceDecisionFooter from "./InvoiceDecisionFooter";
import InvoiceDetailContent from "./InvoiceDetailContent";

// Mobile detail: a full screen. It replaces the app's top bar with a back arrow (to the list,
// keeping its filters) and the invoice number.
export default function InvoiceDetailScreen() {
  const id = Number(useParams().id);
  const { listPath } = useInvoiceListLinks();
  const { data } = useInvoice(id);

  return (
    <>
      <TopBarOverride>
        <Link to={listPath} aria-label="Back to list" className={buttonClass("ghost", "icon-touch")}>
          <ArrowLeft size={18} strokeWidth={2} aria-hidden="true" />
        </Link>
        <span className="truncate text-base font-semibold">{data?.invoice_number ?? `Invoice #${id}`}</span>
      </TopBarOverride>

      {/* The screen is as tall as the space under the top bar (-m-4 cancels AppLayout's p-4):
          the body scrolls and the footer stays at the bottom, as in the panel. */}
      <div className="-m-4 flex h-[calc(100dvh-var(--spacing-topbar))] flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="rounded-xl border border-line bg-surface">
            <InvoiceDetailContent id={id} />
          </div>
        </div>
        <InvoiceDecisionFooter id={id} size="touch-lg" />
      </div>
    </>
  );
}
