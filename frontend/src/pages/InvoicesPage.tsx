import { Outlet } from "react-router-dom";
import InvoiceCards from "../components/invoices/InvoiceCards";
import InvoiceFilters from "../components/invoices/InvoiceFilters";
import InvoiceMobileToolbar from "../components/invoices/InvoiceMobileToolbar";
import InvoiceTable from "../components/invoices/InvoiceTable";
import ListContent from "../components/ListContent";
import MasterDetail from "../components/MasterDetail";
import Pagination from "../components/Pagination";
import { useAuth } from "../hooks/useAuth";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { useClampPage } from "../hooks/useClampPage";
import { useDetailRoute } from "../hooks/useDetailRoute";
import { useInvoiceListParams } from "../hooks/useInvoiceListParams";
import { useInvoices } from "../hooks/useInvoices";
import { INVOICES_BASE } from "../routes";
import { canDecideInvoices } from "../utils/permissions";

export default function InvoicesPage() {
  const { user } = useAuth();
  const breakpoint = useBreakpoint();
  const list = useInvoiceListParams();
  const query = useInvoices(list.apiParams);

  // The page also renders for /invoices/:id, with the panel in the <Outlet />.
  const { detailOpen, detailId } = useDetailRoute(INVOICES_BASE);

  const data = query.data;
  const { pageCount, pastTheEnd } = useClampPage(list.state.page, data, query.isPlaceholderData);

  // Mobile: the detail is its own screen and the list is not rendered behind it.
  if (breakpoint === "mobile" && detailOpen) return <Outlet />;

  const count = data ? `${data.total} ${data.total === 1 ? "invoice" : "invoices"}` : null;

  const content = (
    <ListContent
      query={query}
      waiting={pastTheEnd}
      empty={list.hasFilters ? "No invoices match these filters." : "No invoices yet."}
    >
      {(page) => (
        <>
          {breakpoint !== "mobile" ? (
            <InvoiceTable
              items={page.items}
              // Only the inline panel (xl and up) narrows the table: on tablet the panel is an overlay.
              wide={detailOpen && breakpoint === "desktop"}
              selectedId={detailId ?? undefined}
              canDecide={canDecideInvoices(user?.role)}
              dimmed={query.isPlaceholderData}
            />
          ) : (
            <InvoiceCards items={page.items} dimmed={query.isPlaceholderData} />
          )}
          <Pagination
            page={page.page}
            pageCount={pageCount}
            onPageChange={list.setPage}
            total={page.total}
            pageSize={page.page_size}
          />
        </>
      )}
    </ListContent>
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

  // Tablet and desktop: the list, with the panel or slide-over in the <Outlet /> beside it.
  return (
    <MasterDetail>
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
    </MasterDetail>
  );
}
