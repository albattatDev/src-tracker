import type { AuditFilterKey, AuditUrlState } from "../../hooks/useAuditLogListParams";
import BottomSheet from "../BottomSheet";
import { buttonClass } from "../buttonStyles";
import AuditFilterFields from "./AuditFilterFields";

// Mobile filters in a bottom sheet. Changes apply live (they go to the URL, as on desktop), so
// the footer button just shows how many entries match and closes the sheet.
export default function AuditFilterSheet({
  state,
  hasFilters,
  total,
  onFilterChange,
  onClear,
  onClose,
}: {
  state: AuditUrlState;
  hasFilters: boolean;
  total: number;
  onFilterChange: (key: AuditFilterKey, value: string) => void;
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
            Show {total} {total === 1 ? "entry" : "entries"}
          </button>
        </>
      }
    >
      <AuditFilterFields state={state} onFilterChange={onFilterChange} size="touch" className="flex flex-col gap-4" />
    </BottomSheet>
  );
}
