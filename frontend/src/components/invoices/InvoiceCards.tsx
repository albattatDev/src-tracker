import { Link } from "react-router-dom";
import type { InvoiceOut } from "../../api/invoices";
import { useListLinks } from "../../hooks/useListLinks";
import { INVOICES_BASE, SR_BASE } from "../../routes";
import { formatAmountNumber } from "../../utils/money";
import { AgingBadge, ApprovalStatusBadge } from "../Badges";
import CrossLink from "../CrossLink";

// Mobile list: one card per invoice. The invoice number link is stretched over the whole card;
// the request link is `relative z-10`, so it stays clickable above it.
export default function InvoiceCards({ items, dimmed }: { items: InvoiceOut[]; dimmed: boolean }) {
  const { detailPath } = useListLinks(INVOICES_BASE);

  return (
    <ul className={`flex flex-col gap-3 ${dimmed ? "opacity-60" : ""}`}>
      {items.map((invoice) => (
        <li
          key={invoice.id}
          className="relative rounded-xl border border-line bg-surface p-4 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ink"
        >
          <div className="flex items-center justify-between gap-2">
            <Link
              to={detailPath(invoice.id)}
              className="min-w-0 truncate text-base font-semibold outline-none after:absolute after:inset-0"
            >
              {invoice.invoice_number}
            </Link>
            <ApprovalStatusBadge status={invoice.approval_status} />
          </div>
          <div className="relative z-10 mt-2 text-sm text-ink-soft">
            <CrossLink to={`${SR_BASE}/${invoice.service_request_id}`} className="min-h-11">
              <span className="min-w-0 truncate">
                #{invoice.service_request_id} · {invoice.service_request_title}
              </span>
            </CrossLink>
          </div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="tabular-nums">
              <span className="text-lg font-semibold">{formatAmountNumber(invoice.amount)}</span>{" "}
              <span className="text-sm text-muted">SAR</span>
            </p>
            <AgingBadge invoice={invoice} />
          </div>
        </li>
      ))}
    </ul>
  );
}
