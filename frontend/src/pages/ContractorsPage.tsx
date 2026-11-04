import { useState } from "react";
import { Plus } from "lucide-react";
import { Outlet } from "react-router-dom";
import { buttonClass } from "../components/buttonStyles";
import ContractorCards from "../components/contractors/ContractorCards";
import ContractorFilters from "../components/contractors/ContractorFilters";
import ContractorFormDialog from "../components/contractors/ContractorFormDialog";
import ContractorMobileToolbar from "../components/contractors/ContractorMobileToolbar";
import ContractorTable from "../components/contractors/ContractorTable";
import ListContent from "../components/ListContent";
import MasterDetail from "../components/MasterDetail";
import Pagination from "../components/Pagination";
import { useAuth } from "../hooks/useAuth";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { useClampPage } from "../hooks/useClampPage";
import { useContractorListParams } from "../hooks/useContractorListParams";
import { useContractors } from "../hooks/useContractors";
import { useDetailRoute } from "../hooks/useDetailRoute";
import { CONTRACTORS_BASE } from "../routes";
import { canWriteContractors } from "../utils/permissions";

export default function ContractorsPage() {
  const { user } = useAuth();
  const canWrite = canWriteContractors(user?.role);
  const breakpoint = useBreakpoint();
  const list = useContractorListParams();
  const query = useContractors(list.apiParams);
  const [creating, setCreating] = useState(false);

  // The page also renders for /contractors/:id, with the panel in the <Outlet />.
  const { detailOpen, detailId } = useDetailRoute(CONTRACTORS_BASE);

  const data = query.data;
  const { pageCount, pastTheEnd } = useClampPage(list.state.page, data, query.isPlaceholderData);

  // Mobile: the detail is its own screen and the list is not rendered behind it.
  if (breakpoint === "mobile" && detailOpen) return <Outlet />;

  const count = data ? `${data.total} ${data.total === 1 ? "contractor" : "contractors"}` : null;
  const openNew = () => setCreating(true);

  const content = (
    <ListContent
      query={query}
      waiting={pastTheEnd}
      empty={list.hasFilters ? "No contractors match these filters." : "No contractors yet."}
    >
      {(page) => (
        <>
          {breakpoint !== "mobile" ? (
            <ContractorTable
              items={page.items}
              // Only the inline panel (xl and up) narrows the table: on tablet the panel is an overlay.
              wide={detailOpen && breakpoint === "desktop"}
              selectedId={detailId ?? undefined}
              dimmed={query.isPlaceholderData}
            />
          ) : (
            <ContractorCards items={page.items} dimmed={query.isPlaceholderData} />
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

  const dialog = creating && <ContractorFormDialog onClose={() => setCreating(false)} />;

  if (breakpoint === "mobile") {
    return (
      <div className="flex flex-col gap-4">
        <ContractorMobileToolbar
          state={list.state}
          search={list.search}
          hasFilters={list.hasFilters}
          total={data?.total ?? 0}
          onFilterChange={list.setFilter}
          onClear={list.clearFilters}
          onNew={canWrite ? openNew : undefined}
        />
        {count && <p className="text-muted">{count}</p>}
        {content}
        {dialog}
      </div>
    );
  }

  // Tablet and desktop: the list, with the panel or slide-over in the <Outlet /> beside it.
  return (
    <MasterDetail>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[22px] font-semibold leading-7">Contractors</h1>
          {count && <span className="text-sm text-muted">{count}</span>}
        </div>
        {canWrite && (
          <button type="button" onClick={openNew} className={buttonClass("primary", "md")}>
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            New contractor
          </button>
        )}
      </div>

      <ContractorFilters
        state={list.state}
        search={list.search}
        hasFilters={list.hasFilters}
        onFilterChange={list.setFilter}
        onClear={list.clearFilters}
      />

      {content}
      {dialog}
    </MasterDetail>
  );
}
