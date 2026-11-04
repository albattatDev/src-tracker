import type { FilterKey, ListParams } from "../../hooks/useServiceRequestListParams";
import BottomSheet from "../BottomSheet";
import { buttonClass } from "../buttonStyles";
import FilterFields from "./FilterFields";

// Mobile filters in a bottom sheet. Changes apply live (they go to the URL, as on desktop), so
// the footer button just shows how many requests match and closes the sheet.
export default function FilterSheet({
  params,
  hasFilters,
  canFilterByEngineer,
  total,
  onFilterChange,
  onClear,
  onClose,
}: {
  params: ListParams;
  hasFilters: boolean;
  canFilterByEngineer: boolean;
  total: number;
  onFilterChange: (key: FilterKey, value: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet
      title="Filters"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClear}
            disabled={!hasFilters}
            className={`${buttonClass("secondary", "touch-lg")} flex-1`}
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`${buttonClass("primary", "touch-lg")} flex-[1.5]`}
          >
            Show {total} {total === 1 ? "request" : "requests"}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FilterFields
          params={params}
          canFilterByEngineer={canFilterByEngineer}
          onFilterChange={onFilterChange}
          size="touch"
        />
      </div>
    </BottomSheet>
  );
}
