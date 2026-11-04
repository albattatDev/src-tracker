import type { ContractorFilterKey, ContractorUrlState } from "../../hooks/useContractorListParams";
import BottomSheet from "../BottomSheet";
import { buttonClass } from "../buttonStyles";
import ContractorStatusSelect from "./ContractorStatusSelect";

// Mobile filters in a bottom sheet. Changes apply live (they go to the URL, as on desktop), so
// the footer button just shows how many contractors match and closes the sheet.
export default function ContractorFilterSheet({
  state,
  hasFilters,
  total,
  onFilterChange,
  onClear,
  onClose,
}: {
  state: ContractorUrlState;
  hasFilters: boolean;
  total: number;
  onFilterChange: (key: ContractorFilterKey, value: string) => void;
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
            Show {total} {total === 1 ? "contractor" : "contractors"}
          </button>
        </>
      }
    >
      <ContractorStatusSelect
        value={state.status}
        onChange={(next) => onFilterChange("status", next)}
        size="touch"
      />
    </BottomSheet>
  );
}
