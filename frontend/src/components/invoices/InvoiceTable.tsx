import { Link } from "react-router-dom";
import type { InvoiceOut } from "../../api/invoices";
import { useInvoiceDecision } from "../../hooks/useInvoiceDecision";
import { useListLinks } from "../../hooks/useListLinks";
import { INVOICES_BASE, SR_BASE } from "../../routes";
import { formatDate } from "../../utils/dates";
import { formatAmountNumber } from "../../utils/money";
import { AgingBadge, ApprovalStatusBadge } from "../Badges";
import CrossLink from "../CrossLink";
import DecisionButtons from "./DecisionButtons";

const TH = "h-10 px-4 text-left text-xs font-medium uppercase tracking-wide text-muted";

// Desktop and tablet table. The invoice number is a real link stretched over the whole row
// (after:absolute after:inset-0 on a relative row); the request link and the action buttons are
// `relative z-10`, so they stay clickable above it. `wide` is the table beside the inline panel,
// which already shows the request and the due date, so it drops those two columns.
export default function InvoiceTable({
  items,
  wide,
  selectedId,
  canDecide,
  dimmed,
}: {
  items: InvoiceOut[];
  wide: boolean;
  selectedId: number | undefined;
  canDecide: boolean; // managers only
  dimmed: boolean; // true while the next page loads, so the old rows look "stale"
}) {
  const { detailPath } = useListLinks(INVOICES_BASE);
  const { open, dialog } = useInvoiceDecision();

  return (
    <>
      <div
        className={`overflow-x-auto rounded-xl border border-line bg-surface ${
          dimmed ? "opacity-60" : ""
        }`}
      >
        <table className="w-full text-left text-sm">
          <thead className="bg-canvas">
            <tr className="border-b border-line">
              <th className={TH}>Invoice #</th>
              {!wide && <th className={TH}>Service request</th>}
              <th className={`${TH} text-right`}>Amount (SAR)</th>
              {/* Due is also hidden below 1024px, simply because there is less screen width.
                  Hiding a table cell with CSS is the accepted exception to "one component per
                  breakpoint": useBreakpoint has no 1024px stop. */}
              {!wide && <th className={`${TH} hidden lg:table-cell`}>Due</th>}
              <th className={TH}>Age</th>
              <th className={TH}>Status</th>
              {canDecide && <th className={TH}>Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((invoice) => {
              const selected = invoice.id === selectedId;
              return (
                <tr
                  key={invoice.id}
                  className={`relative h-[52px] has-[a:focus-visible]:outline-2 has-[a:focus-visible]:-outline-offset-2 has-[a:focus-visible]:outline-ink ${
                    selected ? "bg-fill" : "hover:bg-canvas"
                  }`}
                >
                  <td className="whitespace-nowrap px-4 py-2 font-medium">
                    <Link
                      to={detailPath(invoice.id)}
                      aria-current={selected ? "page" : undefined}
                      className="outline-none after:absolute after:inset-0 hover:underline"
                    >
                      {invoice.invoice_number}
                    </Link>
                  </td>
                  {!wide && (
                    <td className="px-4 py-2">
                      <span className="relative z-10">
                        <CrossLink to={`${SR_BASE}/${invoice.service_request_id}`}>
                          #{invoice.service_request_id} · {invoice.service_request_title}
                        </CrossLink>
                      </span>
                    </td>
                  )}
                  <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">
                    {formatAmountNumber(invoice.amount)}
                  </td>
                  {!wide && (
                    <td className="hidden whitespace-nowrap px-4 py-2 text-ink-soft lg:table-cell">
                      {invoice.due_date ? formatDate(invoice.due_date) : "—"}
                    </td>
                  )}
                  <td className="whitespace-nowrap px-4 py-2">
                    <AgingBadge invoice={invoice} />
                  </td>
                  <td className="px-4 py-2">
                    <ApprovalStatusBadge status={invoice.approval_status} />
                  </td>
                  {canDecide && (
                    <td className="whitespace-nowrap px-4 py-2">
                      <DecisionButtons invoice={invoice} size="sm" onDecide={open} />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {dialog}
    </>
  );
}
