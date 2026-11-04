import type { InvoiceFilterKey, InvoiceSearch, InvoiceUrlState } from "../../hooks/useInvoiceListParams";
import { buttonClass } from "../buttonStyles";
import { LABEL } from "../formStyles";
import AgingBandNote from "./AgingBandNote";
import InvoiceFilterFields from "./InvoiceFilterFields";
import InvoiceSearchField from "./InvoiceSearchField";

// Desktop filters: one white card, controls in a wrapping row.
export default function InvoiceFilters({
  state,
  search,
  hasFilters,
  onFilterChange,
  onClear,
}: {
  state: InvoiceUrlState;
  search: InvoiceSearch;
  hasFilters: boolean;
  onFilterChange: (key: InvoiceFilterKey, value: string) => void;
  onClear: () => void;
}) {
  return (
    <section
      aria-label="Filters"
      className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-4"
    >
      <InvoiceFilterFields state={state} onFilterChange={onFilterChange} size="md" />

      <label className={`flex flex-col gap-1.5 ${LABEL.md}`}>
        Invoice number
        <InvoiceSearchField
          text={search.text}
          onTextChange={search.setText}
          size="md"
          placeholder="Search…"
          className="w-56"
        />
      </label>

      <button type="button" onClick={onClear} disabled={!hasFilters} className={buttonClass("ghost", "md")}>
        Clear
      </button>
      <AgingBandNote band={state.band} className="basis-full" />
    </section>
  );
}
