import { Link } from "react-router-dom";
import type { Decision, InvoiceOut } from "../../api/invoices";
import { useInvoiceDecision } from "../../hooks/useInvoiceDecision";
import { usePendingInvoices } from "../../hooks/useDashboardLists";
import { INVOICES_BASE, SR_BASE } from "../../routes";
import { formatAmountNumber } from "../../utils/money";
import Amount from "../Amount";
import { AgingBadge } from "../Badges";
import CrossLink from "../CrossLink";
import DecisionButtons from "../invoices/DecisionButtons";
import TopList from "./TopList";

const TH = "h-10 px-5 text-left text-xs font-medium uppercase tracking-wide text-muted";

// Pending invoices, oldest first. A manager (`canDecide`) gets Approve and Reject on each row;
// an engineer only sees them. The confirm dialog comes from ONE useInvoiceDecision for the
// whole list, not one per row.
export default function PendingInvoiceList({
  title,
  canDecide,
}: {
  title: string;
  canDecide: boolean;
}) {
  const query = usePendingInvoices();
  const { open, dialog } = useInvoiceDecision();

  return (
    <>
      <TopList
        title={title}
        meta={(page) => `Oldest first · ${page.total} pending`}
        metaFallback="Oldest first"
        viewAll={{ to: `${INVOICES_BASE}?status=pending`, label: "View all invoices" }}
        query={query}
        isEmpty={(page) => page.items.length === 0}
        empty={{
          title: "No pending invoices",
          text: canDecide
            ? "Invoices from engineers will appear here to approve or reject."
            : "Invoices you add to a request will appear here until a manager decides.",
        }}
      >
        {(page, layout) =>
          layout === "cards" ? (
            <ul className="flex flex-col gap-3">
              {page.items.map((invoice) => (
                <InvoiceCard key={invoice.id} invoice={invoice} canDecide={canDecide} onDecide={open} />
              ))}
            </ul>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-canvas">
                  <tr className="border-b border-line">
                    <th className={TH}>Invoice</th>
                    <th className={`${TH} text-right`}>Amount (SAR)</th>
                    <th className={TH}>Age</th>
                    {canDecide && <th className={TH}>Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {page.items.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="relative has-[a:focus-visible]:outline-2 has-[a:focus-visible]:-outline-offset-2 has-[a:focus-visible]:outline-ink hover:bg-canvas"
                    >
                      <td className="px-5 py-3">
                        <Link
                          to={`${INVOICES_BASE}/${invoice.id}`}
                          className="font-semibold outline-none after:absolute after:inset-0 hover:underline"
                        >
                          {invoice.invoice_number}
                        </Link>
                        <div className="relative z-10 mt-0.5 text-ink-soft">
                          <CrossLink to={`${SR_BASE}/${invoice.service_request_id}`}>
                            #{invoice.service_request_id} · {invoice.service_request_title}
                          </CrossLink>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                        {formatAmountNumber(invoice.amount)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <AgingBadge invoice={invoice} />
                      </td>
                      {canDecide && (
                        <td className="whitespace-nowrap px-5 py-3">
                          <DecisionButtons invoice={invoice} size="sm" onDecide={open} />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </TopList>
      {dialog}
    </>
  );
}

function InvoiceCard({
  invoice,
  canDecide,
  onDecide,
}: {
  invoice: InvoiceOut;
  canDecide: boolean;
  onDecide: (invoice: InvoiceOut, decision: Decision) => void;
}) {
  return (
    <li className="relative rounded-card border border-line bg-surface p-4 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ink">
      <div className="flex items-center justify-between gap-2">
        <Link
          to={`${INVOICES_BASE}/${invoice.id}`}
          className="min-w-0 truncate text-base font-semibold outline-none after:absolute after:inset-0"
        >
          {invoice.invoice_number}
        </Link>
        <AgingBadge invoice={invoice} />
      </div>
      <div className="relative z-10 mt-1 text-sm text-ink-soft">
        <CrossLink to={`${SR_BASE}/${invoice.service_request_id}`} className="min-h-11">
          <span className="min-w-0 truncate">
            #{invoice.service_request_id} · {invoice.service_request_title}
          </span>
        </CrossLink>
      </div>
      <p className="mt-1">
        <Amount value={invoice.amount} className="text-lg font-semibold" />
      </p>
      {canDecide && (
        <div className="mt-3">
          <DecisionButtons invoice={invoice} size="touch" onDecide={onDecide} />
        </div>
      )}
    </li>
  );
}
