import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import InvoiceCards from "../components/invoices/InvoiceCards";
import InvoiceFilters from "../components/invoices/InvoiceFilters";
import InvoiceMobileToolbar from "../components/invoices/InvoiceMobileToolbar";
import InvoiceTable from "../components/invoices/InvoiceTable";
import { buttonClass } from "../components/buttonStyles";
import Pagination from "../components/Pagination";
import { useAuth } from "../hooks/useAuth";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { useInvoiceListParams } from "../hooks/useInvoiceListParams";
import { useInvoiceRoute } from "../hooks/useInvoiceRoute";
import { useInvoices } from "../hooks/useInvoices";
import { canDecideInvoices } from "../utils/permissions";

export default function InvoicesPage() {
  const { user } = useAuth();
  const breakpoint = useBreakpoint();
  const list = useInvoiceListParams();
  const query = useInvoices(list.apiParams);

  // The page also renders for /invoices/:id, with the panel in the <Outlet />.
  const { kind, id: selectedId } = useInvoiceRoute();
  const detailOpen = kind === "detail";

  const data = query.data;
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : undefined;
  const pastTheEnd = pageCount !== undefined && list.state.page > pageCount;

  // A URL such as ?page=9 on a one-page list jumps to the last real page.
  useEffect(() => {
    if (pageCount !== undefined && !query.isPlaceholderData) list.clampPage(pageCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageCount, list.state.page, query.isPlaceholderData]);

  // Mobile: the detail is its own screen and the list is not rendered behind it.
  if (breakpoint === "mobile" && detailOpen) return <Outlet />;

  const count = data ? `${data.total} ${data.total === 1 ? "invoice" : "invoices"}` : null;

  const content =
    query.isPending || pastTheEnd ? (
      <p className="text-muted">Loading…</p>
    ) : query.isError ? (
      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
        <p className="mb-3">{query.error.message}</p>
        <button type="button" onClick={() => query.refetch()} className={buttonClass("primary", "md")}>
          Retry
        </button>
      </div>
    ) : query.data.total === 0 ? (
      <p className="rounded-xl border border-line bg-surface p-6 text-center text-ink-soft">
        {list.hasFilters ? "No invoices match these filters." : "No invoices yet."}
      </p>
    ) : (
      <>
        {breakpoint !== "mobile" ? (
          <InvoiceTable
            items={query.data.items}
            // Only the inline panel (xl and up) narrows the table: on tablet the panel is an overlay.
            wide={detailOpen && breakpoint === "desktop"}
            selectedId={selectedId}
            canDecide={canDecideInvoices(user?.role)}
            dimmed={query.isPlaceholderData}
          />
        ) : (
          <InvoiceCards items={query.data.items} dimmed={query.isPlaceholderData} />
        )}
        <Pagination
          page={query.data.page}
          pageCount={pageCount ?? 1}
          onPageChange={list.setPage}
          total={query.data.total}
          pageSize={query.data.page_size}
        />
      </>
    );

  if (breakpoint === "mobile") {
    return (
      <div className="flex flex-col gap-4">
        <InvoiceMobileToolbar
          state={list.state}
          search={list.search}
          hasFilters={list.hasFilters}
          total={data?.total ?? 0}
          onFilterChange={list.setFilter}
          onClear={list.clearFilters}
        />
        {count && <p className="text-muted">{count}</p>}
        {content}
      </div>
    );
  }

  // Tablet and desktop. -m-6 cancels the page padding so the panel can sit flush against the top
  // bar, the right edge and the bottom; the list column puts the padding back. Keep the padding
  // here and the margin in step with AppLayout's md:p-6 (same as the Service Requests page).
  return (
    <div className="-m-6 flex items-start">
      <div className="min-w-0 flex-1 p-6">
        <div className="mb-4 flex items-baseline gap-3">
          <h1 className="text-[22px] font-semibold leading-7">Invoices</h1>
          {count && <span className="text-sm text-muted">{count}</span>}
        </div>

        <InvoiceFilters
          state={list.state}
          search={list.search}
          hasFilters={list.hasFilters}
          onFilterChange={list.setFilter}
          onClear={list.clearFilters}
        />

        {content}
      </div>
      {/* The inline panel (desktop) or the slide-over (tablet). */}
      <Outlet />
    </div>
  );
}
