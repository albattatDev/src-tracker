import { Plus } from "lucide-react";
import { Link, Outlet } from "react-router-dom";
import { buttonClass } from "../components/buttonStyles";
import ListContent from "../components/ListContent";
import MasterDetail from "../components/MasterDetail";
import Pagination from "../components/Pagination";
import MobileListToolbar from "../components/serviceRequests/MobileListToolbar";
import ServiceRequestCards from "../components/serviceRequests/ServiceRequestCards";
import ServiceRequestFilters from "../components/serviceRequests/ServiceRequestFilters";
import ServiceRequestTable from "../components/serviceRequests/ServiceRequestTable";
import { useAuth } from "../hooks/useAuth";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { useClampPage } from "../hooks/useClampPage";
import { useListLinks } from "../hooks/useListLinks";
import { useSrRoute } from "../hooks/useSrRoute";
import { useServiceRequestListParams } from "../hooks/useServiceRequestListParams";
import { useServiceRequests } from "../hooks/useServiceRequests";
import { SR_BASE } from "../routes";
import { canCreateRequest, canFilterByEngineer } from "../utils/permissions";

export default function ServiceRequestsPage() {
  const { user } = useAuth();
  const breakpoint = useBreakpoint();
  const newPath = useListLinks(SR_BASE).subPath("new");
  const list = useServiceRequestListParams();
  const query = useServiceRequests(list.params);
  const { params } = list;

  // The page also renders for /service-requests/:id and /new, with the panel or dialog in the
  // <Outlet />.
  const { kind, id: selectedId } = useSrRoute();
  const detailOpen = kind === "detail";

  const data = query.data;
  const { pageCount, pastTheEnd } = useClampPage(params.page, data, query.isPlaceholderData);

  // Mobile: the detail is its own screen and the list is not rendered behind it.
  if (breakpoint === "mobile" && detailOpen) return <Outlet />;

  const canCreate = canCreateRequest(user?.role);
  const canFilter = canFilterByEngineer(user?.role);
  const count = data ? `${data.total} ${data.total === 1 ? "request" : "requests"}` : null;

  const content = (
    <ListContent
      query={query}
      waiting={pastTheEnd}
      empty={list.hasFilters ? "No service requests match these filters." : "No service requests yet."}
    >
      {(page) => (
        <>
          {breakpoint !== "mobile" ? (
            <ServiceRequestTable
              items={page.items}
              sort={{ field: params.sort, order: params.order }}
              onSort={list.toggleSort}
              dimmed={query.isPlaceholderData}
              // Only the inline panel (xl and up) narrows the table: on tablet the panel is an overlay.
              compact={detailOpen && breakpoint === "desktop"}
              selectedId={selectedId}
            />
          ) : (
            <ServiceRequestCards items={page.items} dimmed={query.isPlaceholderData} />
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

  // Tablet and desktop: the list, with the panel, slide-over or new request dialog in the
  // <Outlet /> beside it.
  return (
    <MasterDetail>
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
    </MasterDetail>
  );
}
