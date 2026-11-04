import { Outlet } from "react-router-dom";
import AuditLogCards from "../components/audit/AuditLogCards";
import AuditLogFilters from "../components/audit/AuditLogFilters";
import AuditLogTable from "../components/audit/AuditLogTable";
import AuditMobileToolbar from "../components/audit/AuditMobileToolbar";
import ListContent from "../components/ListContent";
import MasterDetail from "../components/MasterDetail";
import Pagination from "../components/Pagination";
import { useAuth } from "../hooks/useAuth";
import { useAuditLog } from "../hooks/useAuditLog";
import { useAuditLogListParams } from "../hooks/useAuditLogListParams";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { useClampPage } from "../hooks/useClampPage";
import { useDetailRoute } from "../hooks/useDetailRoute";
import { AUDIT_BASE } from "../routes";

export default function AuditLogPage() {
  const { user } = useAuth();
  const breakpoint = useBreakpoint();
  const list = useAuditLogListParams();
  const query = useAuditLog(list.apiParams);

  // The page also renders for /audit-log/:id, with the panel in the <Outlet />.
  const { detailOpen, detailId } = useDetailRoute(AUDIT_BASE);

  const data = query.data;
  const { pageCount, pastTheEnd } = useClampPage(list.state.page, data, query.isPlaceholderData);

  // Mobile: the detail is its own screen and the list is not rendered behind it.
  if (breakpoint === "mobile" && detailOpen) return <Outlet />;

  const count = data ? `${data.total} ${data.total === 1 ? "entry" : "entries"}` : null;

  const content = (
    <ListContent
      query={query}
      waiting={pastTheEnd}
      empty={list.hasFilters ? "No audit entries match these filters." : "No audit entries yet."}
    >
      {(page) => (
        <>
          {breakpoint !== "mobile" ? (
            <AuditLogTable
              items={page.items}
              role={user?.role}
              // Only the inline panel (xl and up) narrows the table: on tablet the panel is an overlay.
              wide={detailOpen && breakpoint === "desktop"}
              selectedId={detailId ?? undefined}
              dimmed={query.isPlaceholderData}
            />
          ) : (
            <AuditLogCards items={page.items} dimmed={query.isPlaceholderData} />
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
        <AuditMobileToolbar
          state={list.state}
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
        <h1 className="text-[22px] font-semibold leading-7">Audit Log</h1>
        {count && <span className="text-sm text-muted">{count}</span>}
      </div>

      <AuditLogFilters
        state={list.state}
        hasFilters={list.hasFilters}
        onFilterChange={list.setFilter}
        onClear={list.clearFilters}
      />

      {content}
    </MasterDetail>
  );
}
