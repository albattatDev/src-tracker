import { useState } from "react";
import { Plus, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import { useListLinks } from "../../hooks/useListLinks";
import { SR_BASE } from "../../routes";
import type { FilterKey, ListParams } from "../../hooks/useServiceRequestListParams";
import { buttonClass } from "../buttonStyles";
import FilterSheet from "./FilterSheet";

// The mobile row under the top bar: Filters (opens the sheet) and New Request.
export default function MobileListToolbar({
  params,
  hasFilters,
  canCreate,
  canFilterByEngineer,
  total,
  onFilterChange,
  onClear,
}: {
  params: ListParams;
  hasFilters: boolean;
  canCreate: boolean;
  canFilterByEngineer: boolean;
  total: number;
  onFilterChange: (key: FilterKey, value: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const newPath = useListLinks(SR_BASE).subPath("new");

  return (
    <>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className={buttonClass("secondary", "touch")}
        >
          <SlidersHorizontal size={16} strokeWidth={2} aria-hidden="true" />
          Filters
        </button>
        {canCreate && (
          <Link to={newPath} className={`${buttonClass("primary", "touch")} flex-1`}>
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            New Request
          </Link>
        )}
      </div>
      {open && (
        <FilterSheet
          params={params}
          hasFilters={hasFilters}
          canFilterByEngineer={canFilterByEngineer}
          total={total}
          onFilterChange={onFilterChange}
          onClear={onClear}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
