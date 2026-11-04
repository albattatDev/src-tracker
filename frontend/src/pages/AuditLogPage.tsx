import AuditLogFilters from "../components/AuditLogFilters";
import AuditLogTable from "../components/AuditLogTable";
import Pagination from "../components/Pagination";
import { useAuth } from "../hooks/useAuth";
import { useAuditLog } from "../hooks/useAuditLog";
import { useAuditLogListParams } from "../hooks/useAuditLogListParams";
import { useClampPage } from "../hooks/useClampPage";

export default function AuditLogPage() {
  const { user } = useAuth();
  const list = useAuditLogListParams();
  const query = useAuditLog(list.apiParams);

  const data = query.data;
  const { pageCount, pastTheEnd } = useClampPage(list.state.page, data, query.isPlaceholderData);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-gray-900">Audit Log</h1>

      <AuditLogFilters
        state={list.state}
        hasFilters={list.hasFilters}
        onFilterChange={list.setFilter}
        onClear={list.clearFilters}
      />

      {query.isPending || pastTheEnd ? (
        <p className="text-gray-600">Loading…</p>
      ) : query.isError ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <p className="mb-2">{query.error.message}</p>
          <button
            onClick={() => query.refetch()}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700"
          >
            Retry
          </button>
        </div>
      ) : query.data.total === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-600">
          {list.hasFilters ? "No audit entries match these filters." : "No audit entries yet."}
        </p>
      ) : (
        <>
          <AuditLogTable
            items={query.data.items}
            role={user?.role}
            dimmed={query.isPlaceholderData}
          />
          <Pagination
            page={query.data.page}
            pageCount={pageCount}
            onPageChange={list.setPage}
          />
        </>
      )}
    </div>
  );
}
