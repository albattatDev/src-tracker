import { useEffect } from "react";
import { Plus } from "lucide-react";
import { Link, Outlet } from "react-router-dom";
import { buttonClass } from "../components/buttonStyles";
import Pagination from "../components/Pagination";
import MobileListToolbar from "../components/serviceRequests/MobileListToolbar";
import ServiceRequestCards from "../components/serviceRequests/ServiceRequestCards";
import ServiceRequestFilters from "../components/serviceRequests/ServiceRequestFilters";
import ServiceRequestTable from "../components/serviceRequests/ServiceRequestTable";
import { useAuth } from "../hooks/useAuth";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { useSrListLinks } from "../hooks/useSrListLinks";
import { useSrRoute } from "../hooks/useSrRoute";
import { useServiceRequestListParams } from "../hooks/useServiceRequestListParams";
import { useServiceRequests } from "../hooks/useServiceRequests";
import { canCreateRequest, canFilterByEngineer } from "../utils/permissions";

export default function ServiceRequestsPage() {
  const { user } = useAuth();
  const breakpoint = useBreakpoint();
  const { newPath } = useSrListLinks();
  const list = useServiceRequestListParams();
  const query = useServiceRequests(list.params);
  const { params } = list;

  // The page also renders for /service-requests/:id and /new, with the panel or dialog in the
  // <Outlet />.
  const { kind, id: selectedId } = useSrRoute();
  const detailOpen = kind === "detail";

  const data = query.data;
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : undefined;
  const pastTheEnd = pageCount !== undefined && params.page > pageCount;

  // A URL such as ?page=9 on a one-page list jumps to the last real page.
  useEffect(() => {
    if (pageCount !== undefined && !query.isPlaceholderData) list.clampPage(pageCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageCount, params.page, query.isPlaceholderData]);

  // Mobile: the detail is its own screen and the list is not rendered behind it.
  if (breakpoint === "mobile" && detailOpen) return <Outlet />;

  const canCreate = canCreateRequest(user?.role);
  const canFilter = canFilterByEngineer(user?.role);
  const count = data ? `${data.total} ${data.total === 1 ? "request" : "requests"}` : null;

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
        {list.hasFilters ? "No service requests match these filters." : "No service requests yet."}
      </p>
    ) : (
      <>
        {breakpoint !== "mobile" ? (
          <ServiceRequestTable
            items={query.data.items}
            sort={{ field: params.sort, order: params.order }}
            onSort={list.toggleSort}
            dimmed={query.isPlaceholderData}
            // Only the inline panel (xl and up) narrows the table: on tablet the panel is an overlay.
            compact={detailOpen && breakpoint === "desktop"}
            selectedId={selectedId}
          />
        ) : (
          <ServiceRequestCards items={query.data.items} dimmed={query.isPlaceholderData} />
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
        <MobileListToolbar
          params={params}
          hasFilters={list.hasFilters}
          canCreate={canCreate}
          canFilterByEngineer={canFilter}
          total={data?.total ?? 0}
          onFilterChange={list.setFilter}
          onClear={list.clearFilters}
        />
        {count && <p className="text-muted">{count}</p>}
        {content}
        <Outlet />
      </div>
    );
  }

  // Tablet and desktop. -m-6 cancels the page padding so the panel can sit flush against the top bar,
  // the right edge and the bottom; the list column puts the padding back. Keep the padding
  // here and the margin in step with AppLayout's md:p-6.
  return (
    <div className="-m-6 flex items-start">
      <div className="min-w-0 flex-1 p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[22px] font-semibold leading-7">Service Requests</h1>
            {count && <span className="text-sm text-muted">{count}</span>}
          </div>
          {canCreate && (
            <Link to={newPath} className={buttonClass("primary", "md")}>
              <Plus size={16} strokeWidth={2} aria-hidden="true" />
              New Request
            </Link>
          )}
        </div>

        <ServiceRequestFilters
          params={params}
          hasFilters={list.hasFilters}
          canFilterByEngineer={canFilter}
          onFilterChange={list.setFilter}
          onClear={list.clearFilters}
        />

        {content}
      </div>
      {/* The inline panel (desktop), the slide-over (tablet) or the new request dialog. */}
      <Outlet />
    </div>
  );
}
