import type { InvoiceFilterKey, InvoiceUrlState } from "../../hooks/useInvoiceListParams";
import BottomSheet from "../BottomSheet";
import { buttonClass } from "../buttonStyles";
import AgingBandNote from "./AgingBandNote";
import InvoiceFilterFields from "./InvoiceFilterFields";

// Mobile filters in a bottom sheet. Changes apply live (they go to the URL, as on desktop), so
// the footer button just shows how many invoices match and closes the sheet.
export default function InvoiceFilterSheet({
  state,
  hasFilters,
  total,
  onFilterChange,
  onClear,
  onClose,
}: {
  state: InvoiceUrlState;
  hasFilters: boolean;
  total: number;
  onFilterChange: (key: InvoiceFilterKey, value: string) => void;
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
          <button type="button" onClick={onClose} className={`${buttonClass("primary", "touch-lg")} flex-[1.5]`}>
            Show {total} {total === 1 ? "invoice" : "invoices"}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <InvoiceFilterFields state={state} onFilterChange={onFilterChange} size="touch" />
        <AgingBandNote band={state.band} />
      </div>
    </BottomSheet>
  );
}
