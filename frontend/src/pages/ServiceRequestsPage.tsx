import { useEffect } from "react";
import { Link } from "react-router-dom";
import Pagination from "../components/Pagination";
import ServiceRequestFilters from "../components/ServiceRequestFilters";
import ServiceRequestTable from "../components/ServiceRequestTable";
import { useAuth } from "../hooks/useAuth";
import { useServiceRequestListParams } from "../hooks/useServiceRequestListParams";
import { useServiceRequests } from "../hooks/useServiceRequests";

export default function ServiceRequestsPage() {
  const { user } = useAuth();
  const list = useServiceRequestListParams();
  const query = useServiceRequests(list.params);
  const { params } = list;

  const data = query.data;
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : undefined;
  const pastTheEnd = pageCount !== undefined && params.page > pageCount;

  // A URL such as ?page=9 on a one-page list jumps to the last real page.
  useEffect(() => {
    if (pageCount !== undefined && !query.isPlaceholderData) list.clampPage(pageCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageCount, params.page, query.isPlaceholderData]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Service Requests</h1>
        {(user?.role === "operations" || user?.role === "manager") && (
          <Link
            to="/service-requests/new"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            New Request
          </Link>
        )}
      </div>

      <ServiceRequestFilters
        params={params}
        hasFilters={list.hasFilters}
        canFilterByEngineer={user?.role === "manager" || user?.role === "admin"}
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
          {list.hasFilters ? "No service requests match these filters." : "No service requests yet."}
        </p>
      ) : (
        <>
          <ServiceRequestTable
            items={query.data.items}
            sort={{ field: params.sort, order: params.order }}
            onSort={list.toggleSort}
            dimmed={query.isPlaceholderData}
          />
          <Pagination
            page={query.data.page}
            pageCount={pageCount ?? 1}
            onPageChange={list.setPage}
          />
        </>
      )}
    </div>
  );
}
