import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import type { InvoiceFilterKey, InvoiceSearch, InvoiceUrlState } from "../../hooks/useInvoiceListParams";
import { buttonClass } from "../buttonStyles";
import InvoiceFilterSheet from "./InvoiceFilterSheet";
import SearchField from "../SearchField";

// The mobile row under the top bar: Filters (opens the sheet) and the invoice number search.
export default function InvoiceMobileToolbar({
  state,
  search,
  hasFilters,
  total,
  onFilterChange,
  onClear,
}: {
  state: InvoiceUrlState;
  search: InvoiceSearch;
  hasFilters: boolean;
  total: number;
  onFilterChange: (key: InvoiceFilterKey, value: string) => void;
  onClear: () => void;
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
          maxLength={50}
          placeholder="Invoice number"
          ariaLabel="Invoice number"
          className="min-w-0 flex-1"
        />
      </div>
      {open && (
        <InvoiceFilterSheet
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
