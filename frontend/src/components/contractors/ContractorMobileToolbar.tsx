import { useState } from "react";
import { Plus, SlidersHorizontal } from "lucide-react";
import type {
  ContractorFilterKey,
  ContractorSearch,
  ContractorUrlState,
} from "../../hooks/useContractorListParams";
import { buttonClass } from "../buttonStyles";
import SearchField from "../SearchField";
import ContractorFilterSheet from "./ContractorFilterSheet";

// The mobile row under the top bar: Filters (opens the sheet), the name search and, for those
// who may write, New (a labelled button, not a bare "+").
export default function ContractorMobileToolbar({
  state,
  search,
  hasFilters,
  total,
  onFilterChange,
  onClear,
  onNew,
}: {
  state: ContractorUrlState;
  search: ContractorSearch;
  hasFilters: boolean;
  total: number;
  onFilterChange: (key: ContractorFilterKey, value: string) => void;
  onClear: () => void;
  onNew: (() => void) | undefined; // undefined: this role cannot create
}) {
  const [open, setOpen] = useState(false);

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
        <SearchField
          text={search.text}
          onTextChange={search.setText}
          size="touch"
          maxLength={200}
          placeholder="Name"
          ariaLabel="Name"
          className="min-w-0 flex-1"
        />
        {onNew && (
          <button
            type="button"
            onClick={onNew}
            aria-label="New contractor"
            className={buttonClass("primary", "touch")}
          >
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            New
          </button>
        )}
      </div>
      {open && (
        <ContractorFilterSheet
          state={state}
          hasFilters={hasFilters}
          total={total}
          onFilterChange={onFilterChange}
          onClear={onClear}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
