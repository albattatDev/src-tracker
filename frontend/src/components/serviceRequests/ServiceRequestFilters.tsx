import type { FilterKey, ListParams } from "../../hooks/useServiceRequestListParams";
import { buttonClass } from "../buttonStyles";
import FilterFields from "./FilterFields";

// Desktop filters: one white card, controls in a wrapping row.
export default function ServiceRequestFilters({
  params,
  hasFilters,
  canFilterByEngineer,
  onFilterChange,
  onClear,
}: {
  params: ListParams;
  hasFilters: boolean;
  canFilterByEngineer: boolean;
  onFilterChange: (key: FilterKey, value: string) => void;
  onClear: () => void;
}) {
  return (
    <section
      aria-label="Filters"
      className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-4"
    >
      <FilterFields
        params={params}
        canFilterByEngineer={canFilterByEngineer}
        onFilterChange={onFilterChange}
        size="md"
      />
      <button
        type="button"
        onClick={onClear}
        disabled={!hasFilters}
        className={buttonClass("ghost", "md")}
      >
        Clear
      </button>
    </section>
  );
}
