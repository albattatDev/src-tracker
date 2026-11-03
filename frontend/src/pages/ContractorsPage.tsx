import { useEffect, useState } from "react";
import ContractorFilters from "../components/ContractorFilters";
import ContractorFormDialog from "../components/ContractorFormDialog";
import ContractorTable from "../components/ContractorTable";
import Pagination from "../components/Pagination";
import { useAuth } from "../hooks/useAuth";
import { useContractorListParams } from "../hooks/useContractorListParams";
import { useContractors } from "../hooks/useContractors";

export default function ContractorsPage() {
  const { user } = useAuth();
  const canWrite = user?.role === "manager"; // admins can look but not change
  const list = useContractorListParams();
  const query = useContractors(list.apiParams);
  const [creating, setCreating] = useState(false);

  const data = query.data;
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : undefined;
  const pastTheEnd = pageCount !== undefined && list.state.page > pageCount;

  // A URL such as ?page=9 on a one-page list jumps to the last real page.
  useEffect(() => {
    if (pageCount !== undefined && !query.isPlaceholderData) list.clampPage(pageCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageCount, list.state.page, query.isPlaceholderData]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Contractors</h1>
        {canWrite && (
          <button
            onClick={() => setCreating(true)}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            New contractor
          </button>
        )}
      </div>

      <ContractorFilters
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
          {list.hasFilters ? "No contractors match these filters." : "No contractors yet."}
        </p>
      ) : (
        <>
          <ContractorTable items={query.data.items} dimmed={query.isPlaceholderData} />
          <Pagination
            page={query.data.page}
            pageCount={pageCount ?? 1}
            onPageChange={list.setPage}
          />
        </>
      )}

      {creating && <ContractorFormDialog onClose={() => setCreating(false)} />}
    </div>
  );
}
