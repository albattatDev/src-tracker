import type {
  ContractorFilterKey,
  ContractorSearch,
  ContractorUrlState,
} from "../../hooks/useContractorListParams";
import { buttonClass } from "../buttonStyles";
import { LABEL } from "../formStyles";
import SearchField from "../SearchField";
import ContractorStatusSelect from "./ContractorStatusSelect";

// Desktop filters: one white card, controls in a wrapping row.
export default function ContractorFilters({
  state,
  search,
  hasFilters,
  onFilterChange,
  onClear,
}: {
  state: ContractorUrlState;
  search: ContractorSearch;
  hasFilters: boolean;
  onFilterChange: (key: ContractorFilterKey, value: string) => void;
  onClear: () => void;
}) {
  return (
    <section
      aria-label="Filters"
      className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-4"
    >
      <label className={`flex flex-col gap-1.5 ${LABEL.md}`}>
        Name
        <SearchField
          text={search.text}
          onTextChange={search.setText}
          size="md"
          maxLength={200}
          placeholder="Search…"
          className="w-56"
        />
      </label>

      <ContractorStatusSelect
        value={state.status}
        onChange={(next) => onFilterChange("status", next)}
        size="md"
        wrapperClassName="w-44"
      />

      <button type="button" onClick={onClear} disabled={!hasFilters} className={buttonClass("ghost", "md")}>
        Clear
      </button>
    </section>
  );
}
